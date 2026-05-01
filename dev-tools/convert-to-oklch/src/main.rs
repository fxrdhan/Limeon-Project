use regex::Regex;
use std::collections::HashSet;
use std::env;
use std::ffi::OsString;
use std::fs;
use std::io;
use std::path::{Component, Path, PathBuf};
use std::process;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Mutex, OnceLock};
use std::thread;

const ALWAYS_IGNORED_DIRS: &[&str] = &[".git"];

#[derive(Clone)]
struct Options {
    all: bool,
    check: bool,
    dry_run: bool,
    help: bool,
    paths: Vec<String>,
    precision: u32,
}

struct IgnoreRule {
    directory_only: bool,
    negated: bool,
    regex: Regex,
}

struct IgnoreMatcher {
    root_dir: PathBuf,
    rules: Vec<IgnoreRule>,
}

#[derive(Clone, Copy)]
struct Color {
    red: f64,
    green: f64,
    blue: f64,
    alpha: f64,
}

struct ParsedChannels {
    channels: Vec<String>,
    alpha: Option<String>,
}

struct ReplacementResult {
    content: String,
    conversions: usize,
}

#[derive(Clone, Copy)]
struct ProcessFileResult {
    changed: bool,
    conversions: usize,
}

fn print_help() {
    println!(
        r#"cto

Usage:
  cto ./src/**/*.css
  cto --all
  cto <file-or-folder-or-glob...>

Options:
  --all          Scan all text files from the current working directory.
  -p, --precision <1-21>
                 Round OKLCH output. Default: 1.
  --dry-run      Preview changed files without writing.
  --check        Exit with code 1 when any file needs conversion. Does not write.
  --write, -w    Accepted for compatibility. Writing is the default.
  --help, -h     Show this help.

Examples:
  bunx cto ./src/**/*.css
  bunx cto ./src/**/*.css -p 2
  npx cto ./src/**/*.css"#
    );
}

fn parse_args(argv: &[String]) -> Result<Options, String> {
    let mut options = Options {
        all: false,
        check: false,
        dry_run: false,
        help: false,
        paths: Vec::new(),
        precision: 1,
    };

    let mut index = 0;
    while index < argv.len() {
        let arg = &argv[index];

        if arg == "--all" || arg == "all" {
            options.all = true;
        } else if arg == "--write" || arg == "-w" {
            // Writing is the default; this flag exists for compatibility.
        } else if arg == "--dry-run" {
            options.dry_run = true;
        } else if arg == "--check" {
            options.check = true;
            options.dry_run = true;
        } else if arg == "--precision" || arg == "-p" {
            let raw_precision = argv
                .get(index + 1)
                .ok_or_else(|| format!("{arg} requires a value from 1 to 21."))?;
            options.precision = parse_precision(raw_precision)?;
            index += 1;
        } else if let Some(raw_precision) = arg.strip_prefix("--precision=") {
            options.precision = parse_precision(raw_precision)?;
        } else if let Some(raw_precision) = compact_precision_arg(arg) {
            options.precision = parse_precision(raw_precision)?;
        } else if arg == "--help" || arg == "-h" {
            options.help = true;
        } else if arg.starts_with('-') {
            return Err(format!("Unknown option: {arg}"));
        } else {
            options.paths.push(arg.to_string());
        }

        index += 1;
    }

    Ok(options)
}

fn compact_precision_arg(arg: &str) -> Option<&str> {
    let value = arg.strip_prefix("-p")?;
    if value.is_empty() || !value.chars().all(|character| character.is_ascii_digit()) {
        return None;
    }

    Some(value)
}

fn parse_precision(value: &str) -> Result<u32, String> {
    let precision = value
        .parse::<u32>()
        .map_err(|_| format!("Invalid precision: {value}. Use a value from 1 to 21."))?;

    if !(1..=21).contains(&precision) {
        return Err(format!(
            "Invalid precision: {value}. Use a value from 1 to 21."
        ));
    }

    Ok(precision)
}

fn read_optional_text_file(file_path: &Path) -> io::Result<String> {
    match fs::read_to_string(file_path) {
        Ok(content) => Ok(content),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(String::new()),
        Err(error) => Err(error),
    }
}

fn normalize_path_for_glob(file_path: &Path) -> String {
    file_path
        .to_string_lossy()
        .replace(std::path::MAIN_SEPARATOR, "/")
}

fn normalize_slashes(value: &str) -> String {
    value.replace('\\', "/")
}

fn glob_pattern_to_regex_source(pattern: &str) -> String {
    let mut source = String::new();
    let chars: Vec<char> = pattern.chars().collect();
    let mut index = 0;

    while index < chars.len() {
        let character = chars[index];
        let next = chars.get(index + 1).copied();

        if character == '*' {
            if next == Some('*') {
                source.push_str(".*");
                index += 2;
            } else {
                source.push_str("[^/]*");
                index += 1;
            }
            continue;
        }

        if character == '?' {
            source.push_str("[^/]");
            index += 1;
            continue;
        }

        source.push_str(&regex::escape(&character.to_string()));
        index += 1;
    }

    source
}

fn parse_ignore_line(line: &str) -> Result<Option<IgnoreRule>, String> {
    let mut pattern = line.trim().to_string();
    if pattern.is_empty() || pattern.starts_with('#') {
        return Ok(None);
    }

    let mut negated = false;
    if let Some(rest) = pattern.strip_prefix('!') {
        negated = true;
        pattern = rest.to_string();
    }

    if pattern.is_empty() || pattern == "/" {
        return Ok(None);
    }

    let directory_only = pattern.ends_with('/');
    let anchored = pattern.starts_with('/');
    pattern = pattern
        .trim_start_matches('/')
        .trim_end_matches('/')
        .to_string();

    if pattern.is_empty() {
        return Ok(None);
    }

    let has_slash = pattern.contains('/');
    let regex_body = glob_pattern_to_regex_source(&pattern);
    let regex_source = if has_slash || anchored {
        format!("^{regex_body}(?:/.*)?$")
    } else {
        format!("(?:^|/){regex_body}(?:/.*)?$")
    };

    let regex = Regex::new(&regex_source)
        .map_err(|error| format!("Invalid ignore pattern {pattern}: {error}"))?;

    Ok(Some(IgnoreRule {
        directory_only,
        negated,
        regex,
    }))
}

fn load_project_ignore_matcher(root_dir: &Path) -> io::Result<IgnoreMatcher> {
    let mut rules = Vec::new();

    for ignore_file_name in [".gitignore", ".ignore"] {
        let content = read_optional_text_file(&root_dir.join(ignore_file_name))?;
        for line in content.lines() {
            if let Some(rule) = parse_ignore_line(line).map_err(io::Error::other)? {
                rules.push(rule);
            }
        }
    }

    Ok(IgnoreMatcher {
        root_dir: root_dir.to_path_buf(),
        rules,
    })
}

impl IgnoreMatcher {
    fn is_ignored(&self, file_path: &Path, is_directory: bool) -> bool {
        let Ok(relative_path) = file_path.strip_prefix(&self.root_dir) else {
            return false;
        };

        if relative_path.as_os_str().is_empty() {
            return false;
        }

        let relative_path = normalize_path_for_glob(relative_path);
        let mut ignored = false;

        for rule in &self.rules {
            if rule.directory_only && !is_directory && !rule.regex.is_match(&relative_path) {
                continue;
            }

            if rule.regex.is_match(&relative_path) {
                ignored = !rule.negated;
            }
        }

        ignored
    }
}

fn is_always_ignored_dir(path: &Path) -> bool {
    let Some(file_name) = path.file_name().and_then(|value| value.to_str()) else {
        return false;
    };

    ALWAYS_IGNORED_DIRS.contains(&file_name)
}

fn collect_files(
    target_path: &Path,
    explicit_file: bool,
    ignore_matcher: &IgnoreMatcher,
    is_root_target: bool,
) -> io::Result<Vec<PathBuf>> {
    let target_stat = fs::metadata(target_path)?;

    if target_stat.is_file() {
        return if explicit_file || !ignore_matcher.is_ignored(target_path, false) {
            Ok(vec![target_path.to_path_buf()])
        } else {
            Ok(Vec::new())
        };
    }

    if !target_stat.is_dir() {
        return Ok(Vec::new());
    }

    if !is_root_target
        && (is_always_ignored_dir(target_path) || ignore_matcher.is_ignored(target_path, true))
    {
        return Ok(Vec::new());
    }

    let mut files = Vec::new();
    for entry in fs::read_dir(target_path)? {
        let entry = entry?;
        let entry_path = entry.path();
        let file_type = entry.file_type()?;

        if file_type.is_dir() {
            if !is_always_ignored_dir(&entry_path) && !ignore_matcher.is_ignored(&entry_path, true)
            {
                files.extend(collect_files(&entry_path, false, ignore_matcher, false)?);
            }
            continue;
        }

        if file_type.is_file() && !ignore_matcher.is_ignored(&entry_path, false) {
            files.push(entry_path);
        }
    }

    Ok(files)
}

fn has_glob_magic(value: &str) -> bool {
    value
        .chars()
        .any(|character| matches!(character, '*' | '?' | '['))
}

fn get_glob_base(pattern: &str) -> String {
    let normalized = normalize_slashes(pattern);
    let Some(magic_index) = normalized.find(['*', '?', '[']) else {
        return pattern.to_string();
    };

    let Some(slash_index) = normalized[..magic_index].rfind('/') else {
        return ".".to_string();
    };

    if slash_index == 0 {
        "/".to_string()
    } else {
        normalized[..slash_index].to_string()
    }
}

fn normalize_lexically(path: PathBuf) -> PathBuf {
    let mut result = PathBuf::new();
    let mut normal_components: Vec<OsString> = Vec::new();
    let mut prefix: Option<OsString> = None;
    let mut has_root = false;

    for component in path.components() {
        match component {
            Component::Prefix(value) => {
                prefix = Some(value.as_os_str().to_os_string());
                normal_components.clear();
            }
            Component::RootDir => {
                has_root = true;
                normal_components.clear();
            }
            Component::CurDir => {}
            Component::ParentDir => {
                normal_components.pop();
            }
            Component::Normal(value) => {
                normal_components.push(value.to_os_string());
            }
        }
    }

    if let Some(prefix) = prefix {
        result.push(prefix);
    }

    if has_root {
        result.push(Path::new(std::path::MAIN_SEPARATOR_STR));
    }

    for component in normal_components {
        result.push(component);
    }

    result
}

fn resolve_path(cwd: &Path, target: &str) -> PathBuf {
    let target_path = Path::new(target);
    let path = if target_path.is_absolute() {
        target_path.to_path_buf()
    } else {
        cwd.join(target_path)
    };

    normalize_lexically(path)
}

fn glob_to_regex(cwd: &Path, pattern: &str) -> Result<Regex, String> {
    let normalized = normalize_path_for_glob(&resolve_path(cwd, pattern));
    let chars: Vec<char> = normalized.chars().collect();
    let mut source = String::from("^");
    let mut index = 0;

    while index < chars.len() {
        let character = chars[index];
        let next = chars.get(index + 1).copied();

        if character == '*' {
            if next == Some('*') {
                let after_next = chars.get(index + 2).copied();
                if after_next == Some('/') {
                    source.push_str("(?:.*/)?");
                    index += 3;
                } else {
                    source.push_str(".*");
                    index += 2;
                }
            } else {
                source.push_str("[^/]*");
                index += 1;
            }
            continue;
        }

        if character == '?' {
            source.push_str("[^/]");
            index += 1;
            continue;
        }

        source.push_str(&regex::escape(&character.to_string()));
        index += 1;
    }

    source.push('$');
    Regex::new(&source).map_err(|error| format!("Invalid glob pattern {pattern}: {error}"))
}

fn collect_target_files(
    target: &str,
    cwd: &Path,
    ignore_matcher: &IgnoreMatcher,
) -> io::Result<Vec<PathBuf>> {
    if !has_glob_magic(target) {
        return collect_files(&resolve_path(cwd, target), true, ignore_matcher, true);
    }

    let base = resolve_path(cwd, &get_glob_base(target));
    let matcher = glob_to_regex(cwd, target).map_err(io::Error::other)?;
    let candidates = collect_files(&base, false, ignore_matcher, true)?;

    Ok(candidates
        .into_iter()
        .filter(|file| matcher.is_match(&normalize_path_for_glob(file)))
        .collect())
}

fn is_text_buffer(buffer: &[u8]) -> bool {
    if buffer.is_empty() {
        return true;
    }

    let scan_length = buffer.len().min(8192);
    !buffer[..scan_length].contains(&0)
}

fn clamp(value: f64, min: f64, max: f64) -> f64 {
    value.min(max).max(min)
}

fn round(value: f64, digits: u32) -> f64 {
    let factor = 10_f64.powi(digits as i32);
    ((value + f64::EPSILON) * factor).round() / factor
}

fn format_number(value: f64, digits: u32) -> String {
    let rounded = round(value, digits);
    let mut formatted = format!("{rounded:.precision$}", precision = digits as usize);

    if formatted.contains('.') {
        while formatted.ends_with('0') {
            formatted.pop();
        }

        if formatted.ends_with('.') {
            formatted.pop();
        }
    }

    if formatted == "-0" {
        "0".to_string()
    } else {
        formatted
    }
}

fn srgb_channel_to_linear(channel: f64) -> f64 {
    if channel <= 0.04045 {
        channel / 12.92
    } else {
        ((channel + 0.055) / 1.055).powf(2.4)
    }
}

fn srgb_to_oklch(red: f64, green: f64, blue: f64) -> (f64, f64, f64) {
    let r = srgb_channel_to_linear(clamp(red, 0.0, 255.0) / 255.0);
    let g = srgb_channel_to_linear(clamp(green, 0.0, 255.0) / 255.0);
    let b = srgb_channel_to_linear(clamp(blue, 0.0, 255.0) / 255.0);

    let l = 0.412_221_470_8 * r + 0.536_332_536_3 * g + 0.051_445_992_9 * b;
    let m = 0.211_903_498_2 * r + 0.680_699_545_1 * g + 0.107_396_956_6 * b;
    let s = 0.088_302_461_9 * r + 0.281_718_837_6 * g + 0.629_978_700_5 * b;

    let l_root = l.cbrt();
    let m_root = m.cbrt();
    let s_root = s.cbrt();

    let lightness = 0.210_454_255_3 * l_root + 0.793_617_785 * m_root - 0.004_072_046_8 * s_root;
    let a = 1.977_998_495_1 * l_root - 2.428_592_205 * m_root + 0.450_593_709_9 * s_root;
    let lab_b = 0.025_904_037_1 * l_root + 0.782_771_766_2 * m_root - 0.808_675_766 * s_root;

    let chroma = (a * a + lab_b * lab_b).sqrt();
    let hue = if chroma < 0.00001 {
        0.0
    } else {
        lab_b.atan2(a) * 180.0 / std::f64::consts::PI
    };

    (lightness, chroma, if hue < 0.0 { hue + 360.0 } else { hue })
}

fn format_oklch(
    red: f64,
    green: f64,
    blue: f64,
    alpha: f64,
    compact_whitespace: bool,
    precision: u32,
) -> String {
    let (lightness, chroma, hue) = srgb_to_oklch(red, green, blue);
    let lightness_part = format!("{}%", format_number(lightness * 100.0, precision));
    let chroma_part = format_number(chroma, precision + 2);
    let hue_part = format_number(hue, precision);
    let separator = if compact_whitespace { "_" } else { " " };
    let alpha_part = if alpha < 1.0 {
        format!(
            "{separator}/{separator}{}",
            format_number(clamp(alpha, 0.0, 1.0), 4)
        )
    } else {
        String::new()
    };

    format!("oklch({lightness_part}{separator}{chroma_part}{separator}{hue_part}{alpha_part})")
}

fn parse_hex_color(hex: &str) -> Option<Color> {
    let normalized = hex.to_ascii_lowercase();
    let bytes = normalized.as_bytes();

    match bytes.len() {
        3 | 4 => {
            let red = parse_hex_pair(bytes[0], bytes[0])?;
            let green = parse_hex_pair(bytes[1], bytes[1])?;
            let blue = parse_hex_pair(bytes[2], bytes[2])?;
            let alpha = if bytes.len() == 4 {
                parse_hex_pair(bytes[3], bytes[3])? as f64 / 255.0
            } else {
                1.0
            };

            Some(Color {
                red: red as f64,
                green: green as f64,
                blue: blue as f64,
                alpha,
            })
        }
        6 | 8 => {
            let red = parse_hex_pair(bytes[0], bytes[1])?;
            let green = parse_hex_pair(bytes[2], bytes[3])?;
            let blue = parse_hex_pair(bytes[4], bytes[5])?;
            let alpha = if bytes.len() == 8 {
                parse_hex_pair(bytes[6], bytes[7])? as f64 / 255.0
            } else {
                1.0
            };

            Some(Color {
                red: red as f64,
                green: green as f64,
                blue: blue as f64,
                alpha,
            })
        }
        _ => None,
    }
}

fn parse_hex_pair(first: u8, second: u8) -> Option<u8> {
    let high = (first as char).to_digit(16)? as u8;
    let low = (second as char).to_digit(16)? as u8;
    Some(high * 16 + low)
}

fn parse_float_prefix(value: &str) -> Option<f64> {
    let value = value.trim_start();
    let bytes = value.as_bytes();
    let mut index = 0;

    if matches!(bytes.get(index), Some(b'+') | Some(b'-')) {
        index += 1;
    }

    let mut has_digits = false;
    while matches!(bytes.get(index), Some(byte) if byte.is_ascii_digit()) {
        index += 1;
        has_digits = true;
    }

    if bytes.get(index) == Some(&b'.') {
        index += 1;
        while matches!(bytes.get(index), Some(byte) if byte.is_ascii_digit()) {
            index += 1;
            has_digits = true;
        }
    }

    if !has_digits {
        return None;
    }

    let before_exponent = index;
    if matches!(bytes.get(index), Some(b'e') | Some(b'E')) {
        index += 1;

        if matches!(bytes.get(index), Some(b'+') | Some(b'-')) {
            index += 1;
        }

        let exponent_start = index;
        while matches!(bytes.get(index), Some(byte) if byte.is_ascii_digit()) {
            index += 1;
        }

        if index == exponent_start {
            index = before_exponent;
        }
    }

    value[..index].parse::<f64>().ok()
}

fn parse_rgb_channel(value: &str) -> Option<f64> {
    let trimmed = value.trim();
    if let Some(percent_value) = trimmed.strip_suffix('%') {
        let percent = parse_float_prefix(percent_value)?;
        return Some(clamp((percent / 100.0) * 255.0, 0.0, 255.0));
    }

    let channel = parse_float_prefix(trimmed)?;
    Some(clamp(channel, 0.0, 255.0))
}

fn parse_alpha(value: &str) -> Option<f64> {
    let trimmed = value.trim();
    if let Some(percent_value) = trimmed.strip_suffix('%') {
        let percent = parse_float_prefix(percent_value)?;
        return Some(clamp(percent / 100.0, 0.0, 1.0));
    }

    let alpha = parse_float_prefix(trimmed)?;
    Some(clamp(alpha, 0.0, 1.0))
}

fn parse_hue(value: &str) -> Option<f64> {
    let trimmed = value.trim().to_ascii_lowercase();
    let number = parse_float_prefix(&trimmed)?;

    if trimmed.ends_with("turn") {
        return Some(number * 360.0);
    }

    if trimmed.ends_with("rad") {
        return Some(number * 180.0 / std::f64::consts::PI);
    }

    if trimmed.ends_with("grad") {
        return Some(number * 0.9);
    }

    Some(number)
}

fn parse_percentage(value: &str) -> Option<f64> {
    let trimmed = value.trim();
    let percent_value = trimmed.strip_suffix('%')?;
    let percent = parse_float_prefix(percent_value)?;
    Some(clamp(percent / 100.0, 0.0, 1.0))
}

fn slash_regex() -> &'static Regex {
    static SLASH_RE: OnceLock<Regex> = OnceLock::new();
    SLASH_RE.get_or_init(|| Regex::new(r"\s*/\s*").expect("valid slash regex"))
}

fn split_modern_color_body(body: &str) -> Option<ParsedChannels> {
    let normalized = slash_regex().replace_all(body.trim(), " / ");
    let parts: Vec<String> = normalized
        .split_whitespace()
        .filter(|part| !part.is_empty())
        .map(str::to_string)
        .collect();
    let slash_index = parts.iter().position(|part| part == "/");

    match slash_index {
        None if parts.len() == 3 => Some(ParsedChannels {
            channels: parts,
            alpha: None,
        }),
        Some(3) if parts.len() == 5 => Some(ParsedChannels {
            alpha: Some(parts[4].clone()),
            channels: parts[..3].to_vec(),
        }),
        _ => None,
    }
}

fn dynamic_color_regex() -> &'static Regex {
    static DYNAMIC_COLOR_RE: OnceLock<Regex> = OnceLock::new();
    DYNAMIC_COLOR_RE
        .get_or_init(|| Regex::new(r"(?i)var\(|calc\(|color-mix\(|from\b").expect("valid regex"))
}

fn parse_rgb_color(function_name: &str, body: &str) -> Option<Color> {
    if dynamic_color_regex().is_match(body) {
        return None;
    }

    let comma_parts: Vec<String> = body
        .split(',')
        .map(|part| part.trim().to_string())
        .collect();
    if comma_parts.len() > 1 && comma_parts.len() != 3 && comma_parts.len() != 4 {
        return None;
    }

    let parsed = if comma_parts.len() > 1 {
        ParsedChannels {
            alpha: if comma_parts.len() == 4 {
                Some(comma_parts[3].clone())
            } else {
                None
            },
            channels: comma_parts[..3].to_vec(),
        }
    } else {
        split_modern_color_body(body)?
    };

    if parsed.channels.len() != 3 {
        return None;
    }

    if function_name.eq_ignore_ascii_case("rgba") && parsed.alpha.is_none() {
        return None;
    }

    let red = parse_rgb_channel(&parsed.channels[0])?;
    let green = parse_rgb_channel(&parsed.channels[1])?;
    let blue = parse_rgb_channel(&parsed.channels[2])?;
    let alpha = parsed.alpha.as_deref().map_or(Some(1.0), parse_alpha)?;

    Some(Color {
        red,
        green,
        blue,
        alpha,
    })
}

fn hsl_to_rgb(hue: f64, saturation: f64, lightness: f64) -> (f64, f64, f64) {
    let normalized_hue = ((hue % 360.0) + 360.0) % 360.0;
    let chroma = (1.0 - (2.0 * lightness - 1.0).abs()) * saturation;
    let x = chroma * (1.0 - ((normalized_hue / 60.0) % 2.0 - 1.0).abs());
    let adjustment = lightness - chroma / 2.0;

    let (mut red, mut green, mut blue) = (0.0, 0.0, 0.0);
    if normalized_hue < 60.0 {
        red = chroma;
        green = x;
    } else if normalized_hue < 120.0 {
        red = x;
        green = chroma;
    } else if normalized_hue < 180.0 {
        green = chroma;
        blue = x;
    } else if normalized_hue < 240.0 {
        green = x;
        blue = chroma;
    } else if normalized_hue < 300.0 {
        red = x;
        blue = chroma;
    } else {
        red = chroma;
        blue = x;
    }

    (
        (red + adjustment) * 255.0,
        (green + adjustment) * 255.0,
        (blue + adjustment) * 255.0,
    )
}

fn parse_hsl_color(function_name: &str, body: &str) -> Option<Color> {
    if dynamic_color_regex().is_match(body) {
        return None;
    }

    let comma_parts: Vec<String> = body
        .split(',')
        .map(|part| part.trim().to_string())
        .collect();
    if comma_parts.len() > 1 && comma_parts.len() != 3 && comma_parts.len() != 4 {
        return None;
    }

    let parsed = if comma_parts.len() > 1 {
        ParsedChannels {
            alpha: if comma_parts.len() == 4 {
                Some(comma_parts[3].clone())
            } else {
                None
            },
            channels: comma_parts[..3].to_vec(),
        }
    } else {
        split_modern_color_body(body)?
    };

    if parsed.channels.len() != 3 {
        return None;
    }

    if function_name.eq_ignore_ascii_case("hsla") && parsed.alpha.is_none() {
        return None;
    }

    let hue = parse_hue(&parsed.channels[0])?;
    let saturation = parse_percentage(&parsed.channels[1])?;
    let lightness = parse_percentage(&parsed.channels[2])?;
    let alpha = parsed.alpha.as_deref().map_or(Some(1.0), parse_alpha)?;
    let (red, green, blue) = hsl_to_rgb(hue, saturation, lightness);

    Some(Color {
        red,
        green,
        blue,
        alpha,
    })
}

fn is_inside_url(content: &str, index: usize) -> bool {
    let line_start = content[..index]
        .rfind('\n')
        .map_or(0, |position| position + 1);
    let prefix = &content[line_start..index];
    let lowercase_prefix = prefix.to_ascii_lowercase();
    let Some(url_index) = lowercase_prefix.rfind("url(") else {
        return false;
    };

    !prefix[url_index..].contains(')')
}

struct BracketContext<'a> {
    before: &'a str,
}

fn find_bracket_context(content: &str, index: usize) -> Option<BracketContext<'_>> {
    let open = content[..index].rfind('[')?;
    let close_before = content[..index].rfind(']');
    if close_before.is_some_and(|close| close > open) {
        return None;
    }

    let close = content[index..]
        .find(']')
        .map(|position| index + position)?;
    let segment = &content[open + 1..close];
    if segment.contains('\n') || segment.contains('\r') {
        return None;
    }

    Some(BracketContext {
        before: &content[open + 1..index],
    })
}

fn is_likely_tailwind_arbitrary_value(content: &str, index: usize) -> bool {
    let Some(context) = find_bracket_context(content, index) else {
        return false;
    };

    !context.before.contains('=')
}

fn is_likely_attribute_selector_hex(content: &str, index: usize) -> bool {
    let Some(context) = find_bracket_context(content, index) else {
        return false;
    };

    let before = context.before.trim_end_matches(|character: char| {
        character.is_whitespace() || character == '\'' || character == '"'
    });
    before.ends_with('=')
}

fn is_likely_css_selector(content: &str, index: usize, token_length: usize) -> bool {
    let line_start = content[..index]
        .rfind('\n')
        .map_or(0, |position| position + 1);
    let before = &content[line_start..index];
    let after = &content[index + token_length..];
    let next_significant = after.trim_start();

    before.trim().is_empty()
        && (next_significant.starts_with('{') || next_significant.starts_with(','))
}

fn parse_functional_color(function_name: &str, body: &str) -> Option<Color> {
    if function_name.to_ascii_lowercase().starts_with("hsl") {
        parse_hsl_color(function_name, body)
    } else {
        parse_rgb_color(function_name, body)
    }
}

fn functional_color_regex() -> &'static Regex {
    static FUNCTIONAL_COLOR_RE: OnceLock<Regex> = OnceLock::new();
    FUNCTIONAL_COLOR_RE.get_or_init(|| {
        Regex::new(r"(?i)((?:rgb|hsl)a?)\(\s*([^)]*?)\s*\)").expect("valid color regex")
    })
}

fn previous_char_is_ascii_letter(content: &str, index: usize) -> bool {
    content[..index]
        .chars()
        .next_back()
        .is_some_and(|character| character.is_ascii_alphabetic())
}

fn previous_char_blocks_hex(content: &str, index: usize) -> bool {
    content[..index]
        .chars()
        .next_back()
        .is_some_and(|character| {
            character.is_ascii_alphanumeric() || character == '_' || character == '-'
        })
}

fn replace_functional_colors(content: &str, precision: u32) -> ReplacementResult {
    let mut conversions = 0;
    let mut replaced = String::with_capacity(content.len());
    let mut last_index = 0;

    for captures in functional_color_regex().captures_iter(content) {
        let full_match = captures.get(0).expect("full match");
        let start = full_match.start();
        let end = full_match.end();
        let function_name = captures.get(1).expect("function name").as_str();
        let body = captures.get(2).expect("function body").as_str();

        replaced.push_str(&content[last_index..start]);

        if previous_char_is_ascii_letter(content, start) {
            replaced.push_str(full_match.as_str());
            last_index = end;
            continue;
        }

        let color = parse_functional_color(function_name, body);
        if let Some(color) = color
            && !is_inside_url(content, start)
        {
            conversions += 1;
            replaced.push_str(&format_oklch(
                color.red,
                color.green,
                color.blue,
                color.alpha,
                is_likely_tailwind_arbitrary_value(content, start),
                precision,
            ));
            last_index = end;
            continue;
        }

        replaced.push_str(full_match.as_str());
        last_index = end;
    }

    replaced.push_str(&content[last_index..]);
    ReplacementResult {
        content: replaced,
        conversions,
    }
}

fn replace_hex_colors(content: &str, precision: u32) -> ReplacementResult {
    let mut conversions = 0;
    let mut replaced = String::with_capacity(content.len());
    let mut last_index = 0;
    let bytes = content.as_bytes();
    let mut index = 0;

    while index < bytes.len() {
        if bytes[index] != b'#' {
            index += 1;
            continue;
        }

        if previous_char_blocks_hex(content, index) {
            index += 1;
            continue;
        }

        let hex_start = index + 1;
        let mut hex_end = hex_start;
        while hex_end < bytes.len() && bytes[hex_end].is_ascii_hexdigit() {
            hex_end += 1;
        }

        let hex_length = hex_end - hex_start;
        if !matches!(hex_length, 3 | 4 | 6 | 8) {
            index += 1;
            continue;
        }

        let hex = &content[hex_start..hex_end];
        let Some(color) = parse_hex_color(hex) else {
            index += 1;
            continue;
        };

        let token_length = hex_length + 1;
        if is_inside_url(content, index)
            || is_likely_attribute_selector_hex(content, index)
            || is_likely_css_selector(content, index, token_length)
        {
            index += 1;
            continue;
        }

        replaced.push_str(&content[last_index..index]);
        replaced.push_str(&format_oklch(
            color.red,
            color.green,
            color.blue,
            color.alpha,
            is_likely_tailwind_arbitrary_value(content, index),
            precision,
        ));
        conversions += 1;
        index = hex_end;
        last_index = hex_end;
    }

    replaced.push_str(&content[last_index..]);
    ReplacementResult {
        content: replaced,
        conversions,
    }
}

fn replace_colors(content: &str, precision: u32) -> ReplacementResult {
    let function_result = replace_functional_colors(content, precision);
    let hex_result = replace_hex_colors(&function_result.content, precision);

    ReplacementResult {
        content: hex_result.content,
        conversions: function_result.conversions + hex_result.conversions,
    }
}

fn process_file(file_path: &Path, options: &Options) -> io::Result<ProcessFileResult> {
    let buffer = fs::read(file_path)?;
    if !is_text_buffer(&buffer) {
        return Ok(ProcessFileResult {
            changed: false,
            conversions: 0,
        });
    }

    let original = String::from_utf8_lossy(&buffer).into_owned();
    let result = replace_colors(&original, options.precision);
    let changed = result.content != original;

    if changed && !options.dry_run {
        fs::write(file_path, result.content.as_bytes())?;
    }

    Ok(ProcessFileResult {
        changed,
        conversions: result.conversions,
    })
}

fn process_files(files: &[PathBuf], options: &Options) -> Vec<Result<ProcessFileResult, String>> {
    if files.is_empty() {
        return Vec::new();
    }

    let worker_count = thread::available_parallelism()
        .map(|parallelism| parallelism.get())
        .unwrap_or(1)
        .min(files.len());
    let next_index = AtomicUsize::new(0);
    let results = Mutex::new((0..files.len()).map(|_| None).collect::<Vec<_>>());

    thread::scope(|scope| {
        for _ in 0..worker_count {
            scope.spawn(|| {
                loop {
                    let index = next_index.fetch_add(1, Ordering::Relaxed);
                    if index >= files.len() {
                        break;
                    }

                    let result = process_file(&files[index], options)
                        .map_err(|error| format!("{}: {error}", files[index].display()));
                    results.lock().expect("results lock")[index] = Some(result);
                }
            });
        }
    });

    results
        .into_inner()
        .expect("results lock")
        .into_iter()
        .map(|result| result.unwrap_or_else(|| Err("internal worker result missing".to_string())))
        .collect()
}

fn relative_display_path(cwd: &Path, file_path: &Path) -> String {
    let cwd = normalize_lexically(cwd.to_path_buf());
    let file_path = normalize_lexically(file_path.to_path_buf());
    let (cwd_prefix, cwd_has_root, cwd_components) = split_relative_components(&cwd);
    let (file_prefix, file_has_root, file_components) = split_relative_components(&file_path);

    if cwd_prefix != file_prefix || cwd_has_root != file_has_root {
        return normalize_path_for_glob(&file_path);
    }

    let mut common_length = 0;
    while common_length < cwd_components.len()
        && common_length < file_components.len()
        && cwd_components[common_length] == file_components[common_length]
    {
        common_length += 1;
    }

    let mut relative_path = PathBuf::new();
    for _ in common_length..cwd_components.len() {
        relative_path.push("..");
    }

    for component in &file_components[common_length..] {
        relative_path.push(component);
    }

    normalize_path_for_glob(&relative_path)
}

fn split_relative_components(path: &Path) -> (Option<OsString>, bool, Vec<OsString>) {
    let mut prefix = None;
    let mut has_root = false;
    let mut components = Vec::new();

    for component in path.components() {
        match component {
            Component::Prefix(value) => prefix = Some(value.as_os_str().to_os_string()),
            Component::RootDir => has_root = true,
            Component::CurDir => {}
            Component::ParentDir => components.push(OsString::from("..")),
            Component::Normal(value) => components.push(value.to_os_string()),
        }
    }

    (prefix, has_root, components)
}

fn run() -> Result<i32, String> {
    let argv: Vec<String> = env::args().skip(1).collect();
    let options = match parse_args(&argv) {
        Ok(options) => options,
        Err(error) => {
            eprintln!("{error}");
            print_help();
            return Ok(2);
        }
    };

    if options.help {
        print_help();
        return Ok(0);
    }

    if !options.all && options.paths.is_empty() {
        print_help();
        return Ok(2);
    }

    let cwd = env::current_dir().map_err(|error| error.to_string())?;
    let targets = if options.all {
        let mut targets = vec![normalize_path_for_glob(&cwd)];
        targets.extend(options.paths.clone());
        targets
    } else {
        options.paths.clone()
    };
    let ignore_matcher = load_project_ignore_matcher(&cwd).map_err(|error| error.to_string())?;
    let mut files = HashSet::new();

    for target in &targets {
        let collected = if options.all && Path::new(target) == cwd {
            collect_files(&cwd, false, &ignore_matcher, true)
        } else {
            collect_target_files(target, &cwd, &ignore_matcher)
        }
        .map_err(|error| format!("{target}: {error}"))?;

        if collected.is_empty() && has_glob_magic(target) {
            eprintln!("No files matched: {target}");
        }

        files.extend(collected);
    }

    let mut files: Vec<PathBuf> = files.into_iter().collect();
    files.sort_by_key(|file| normalize_path_for_glob(file));

    let results = process_files(&files, &options);
    let mut changed_files = 0;
    let mut total_conversions = 0;

    for (file, result) in files.iter().zip(results) {
        let result = result?;
        if !result.changed {
            continue;
        }

        changed_files += 1;
        total_conversions += result.conversions;
        println!(
            "{} {} ({})",
            if options.dry_run {
                "would update"
            } else {
                "updated"
            },
            relative_display_path(&cwd, file),
            result.conversions
        );
    }

    let mode = if options.dry_run { "dry-run" } else { "write" };
    println!("{mode}: {changed_files} file(s), {total_conversions} conversion(s)");

    if options.check && changed_files > 0 {
        return Ok(1);
    }

    Ok(0)
}

fn main() {
    match run() {
        Ok(code) => process::exit(code),
        Err(error) => {
            eprintln!("{error}");
            process::exit(1);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn converts_hex_rgb_rgba_and_hsl() {
        let input = concat!(
            "a{color:",
            "#",
            "66addd;background:",
            "r",
            "gb(102, 173, 221);border:",
            "r",
            "gba(192,132,252,0.5);accent:",
            "h",
            "sl(210 68% 63% / 50%)}"
        );
        let result = replace_colors(input, 1);

        assert_eq!(result.conversions, 4);
        assert_eq!(
            result.content,
            "a{color:oklch(72% 0.1 239.8);background:oklch(72% 0.1 239.8);border:oklch(72.2% 0.177 305.5 / 0.5);accent:oklch(69.2% 0.116 249.8 / 0.5)}"
        );
    }

    #[test]
    fn keeps_tailwind_arbitrary_values_compact_and_skips_attribute_selectors() {
        let input = concat!(
            "<div class=\"shadow-[0_0_12px_",
            "r",
            "gba(192,132,252,0.5)] [&_.dot[stroke='",
            "#",
            "fff']]",
            "\"></div>"
        );
        let result = replace_colors(input, 1);

        assert_eq!(result.conversions, 1);
        assert_eq!(
            result.content,
            "<div class=\"shadow-[0_0_12px_oklch(72.2%_0.177_305.5_/_0.5)] [&_.dot[stroke='#fff']]\"></div>"
        );
    }

    #[test]
    fn skips_urls_css_id_selectors_and_dynamic_functions() {
        let input = concat!(
            "#",
            "fff { background: url(",
            "#",
            "abc); color: ",
            "r",
            "gb(var(--x)); border-color: ",
            "#",
            "000; }"
        );
        let result = replace_colors(input, 1);

        assert_eq!(result.conversions, 1);
        assert_eq!(
            result.content,
            concat!(
                "#",
                "fff { background: url(",
                "#",
                "abc); color: ",
                "r",
                "gb(var(--x)); border-color: oklch(0% 0 0); }"
            )
        );
    }
}
