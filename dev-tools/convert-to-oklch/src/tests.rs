use super::*;
use std::process;

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

#[test]
fn rejects_malformed_numeric_tokens() {
    assert!(parse_rgb_color("rgb", "10abc 20 30").is_none());
    assert!(parse_rgb_color("rgb", "10px 20 30").is_none());
    assert!(parse_rgb_color("rgb", "10 % 20% 30%").is_none());
    assert!(parse_rgb_color("rgba", "10, 20, 30, 0.5foo").is_none());
    assert!(parse_hsl_color("hsl", "90deg 50 % 50%").is_none());

    assert!(parse_rgb_color("rgb", "+10 .5 1e2").is_some());
    assert!(parse_alpha("50%").is_some());
    assert!(parse_alpha("50 %").is_none());
}

#[test]
fn parses_css_hue_units_strictly() {
    assert_close(parse_hue("90").expect("unitless hue"), 90.0);
    assert_close(parse_hue("90deg").expect("deg hue"), 90.0);
    assert_close(parse_hue("100grad").expect("grad hue"), 90.0);
    assert_close(parse_hue("0.25turn").expect("turn hue"), 90.0);
    assert_close(parse_hue("1.5707963267948966rad").expect("rad hue"), 90.0);

    assert!(parse_hue("90 deg").is_none());
    assert!(parse_hue("90degfoo").is_none());
    assert!(parse_hue("100gradfoo").is_none());
}

#[test]
fn skips_hidden_directories_even_when_ignore_file_reincludes_them() {
    let temp_dir = TestTempDir::new("hidden-dirs");
    let root = temp_dir.path();
    fs::create_dir_all(root.join(".agents")).expect("create hidden directory");
    fs::write(root.join(".ignore"), "!.agents/\n").expect("write ignore file");
    fs::write(root.join(".agents").join("hidden.css"), concat!("#", "fff"))
        .expect("write hidden file");
    fs::write(root.join("visible.css"), concat!("#", "000")).expect("write visible file");

    let ignore_matcher = load_project_ignore_matcher(root).expect("load ignore matcher");
    let files = collect_files(root, false, &ignore_matcher, true).expect("collect files");
    let relative_files = files
        .iter()
        .map(|file| normalize_path_for_glob(file.strip_prefix(root).expect("relative path")))
        .collect::<HashSet<_>>();

    assert!(relative_files.contains("visible.css"));
    assert!(!relative_files.contains(".agents/hidden.css"));
}

#[test]
fn keeps_markdown_diff_deletions_as_source_examples() {
    let input = concat!(
        "```diff\n",
        "- background: ",
        "r",
        "gb(102, 173, 221);\n",
        "+ background: ",
        "r",
        "gb(102, 173, 221);\n",
        "```\n",
        "color: ",
        "#",
        "000;\n"
    );
    let result = replace_colors(input, 1);

    assert_eq!(result.conversions, 2);
    assert_eq!(
        result.content,
        concat!(
            "```diff\n",
            "- background: ",
            "r",
            "gb(102, 173, 221);\n",
            "+ background: oklch(72% 0.1 239.8);\n",
            "```\n",
            "color: oklch(0% 0 0);\n"
        )
    );
}

fn assert_close(actual: f64, expected: f64) {
    assert!(
        (actual - expected).abs() < 0.0000001,
        "expected {actual} to be close to {expected}"
    );
}

struct TestTempDir {
    path: PathBuf,
}

impl TestTempDir {
    fn new(name: &str) -> Self {
        let unique = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("system time")
            .as_nanos();
        let path = env::temp_dir().join(format!("cto-{name}-{}-{unique}", process::id()));
        fs::create_dir_all(&path).expect("create temp directory");

        Self { path }
    }

    fn path(&self) -> &Path {
        &self.path
    }
}

impl Drop for TestTempDir {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.path);
    }
}
