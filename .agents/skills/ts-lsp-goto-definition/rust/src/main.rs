use serde_json::{json, Value};
use std::env;
use std::fs;
use std::io::{BufRead, BufReader, Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};

struct Args {
    root: PathBuf,
    file: Option<PathBuf>,
    line: Option<usize>,
    character: Option<usize>,
    find: Option<String>,
    occurrence: usize,
    server: String,
    server_args: Vec<String>,
    help: bool,
}

fn parse_args() -> Result<Args, String> {
    let mut args = Args {
        root: env::current_dir().map_err(|e| e.to_string())?,
        file: None,
        line: None,
        character: None,
        find: None,
        occurrence: 1,
        server: "typescript-language-server".to_string(),
        server_args: vec!["--stdio".to_string()],
        help: false,
    };

    let mut iter = env::args().skip(1).peekable();
    let mut rest: Vec<String> = Vec::new();
    while let Some(token) = iter.next() {
        if token == "--" {
            rest.extend(iter);
            break;
        }
        match token.as_str() {
            "--root" => args.root = PathBuf::from(iter.next().ok_or("--root requires a value")?),
            "--file" => args.file = Some(PathBuf::from(iter.next().ok_or("--file requires a value")?)),
            "--line" => {
                let value = iter.next().ok_or("--line requires a value")?;
                args.line = Some(value.parse::<usize>().map_err(|_| "--line must be a number")?);
            }
            "--character" => {
                let value = iter.next().ok_or("--character requires a value")?;
                args.character = Some(value.parse::<usize>().map_err(|_| "--character must be a number")?);
            }
            "--find" => args.find = Some(iter.next().ok_or("--find requires a value")?),
            "--occurrence" => {
                let value = iter.next().ok_or("--occurrence requires a value")?;
                args.occurrence = value
                    .parse::<usize>()
                    .map_err(|_| "--occurrence must be a number")?;
            }
            "--server" => args.server = iter.next().ok_or("--server requires a value")?,
            "--server-arg" => args
                .server_args
                .push(iter.next().ok_or("--server-arg requires a value")?),
            "--help" | "-h" => args.help = true,
            _ => rest.push(token),
        }
    }

    if !rest.is_empty() {
        return Err(format!(
            "Unknown args: {}\nUse --help to see supported flags.",
            rest.join(" ")
        ));
    }

    Ok(args)
}

fn print_help() {
    println!("ts_goto_definition");
    println!();
    println!("Realistic LSP go-to-definition via typescript-language-server (stdio).");
    println!();
    println!("Usage:");
    println!("  ts_goto_definition --file <path> --line <1-based> --character <1-based> [--root <path>]");
    println!("  ts_goto_definition --file <path> --find <text> [--occurrence <n>] [--root <path>]");
    println!();
    println!("Optional:");
    println!("  --find <text>           When --line/--character are omitted, auto-picks the Nth match in the file");
    println!("  --occurrence <n>        1-based; default: 1");
    println!("  --server <cmd>          Default: typescript-language-server");
    println!("  --server-arg <arg>      Repeatable; defaults include --stdio");
    println!();
    println!("Output:");
    println!("  JSON array of locations (Location or LocationLink normalized).");
}

fn guess_language_id(file_path: &Path) -> &str {
    match file_path.extension().and_then(|ext| ext.to_str()).unwrap_or("") {
        "ts" => "typescript",
        "tsx" => "typescriptreact",
        "js" => "javascript",
        "jsx" => "javascriptreact",
        "json" => "json",
        _ => "plaintext",
    }
}

fn to_file_uri(file_path: &Path) -> Result<String, String> {
    let abs = fs::canonicalize(file_path).map_err(|e| e.to_string())?;
    let path = abs.to_string_lossy().replace('\\', "/");
    if path.starts_with('/') {
        Ok(format!("file://{}", path))
    } else {
        Ok(format!("file:///{}", path))
    }
}

fn resolve_position(
    text: &str,
    line: Option<usize>,
    character: Option<usize>,
    find: Option<&str>,
    occurrence: usize,
) -> Result<Option<(usize, usize)>, String> {
    if let (Some(line), Some(character)) = (line, character) {
        return Ok(Some((line, character)));
    }

    let find = match find {
        Some(value) => value,
        None => return Ok(None),
    };

    if find.is_empty() {
        return Err("--find must be a non-empty string".to_string());
    }

    if occurrence == 0 {
        return Err("--occurrence must be >= 1".to_string());
    }

    let haystack = text.as_bytes();
    let needle = find.as_bytes();
    let mut match_index: Option<usize> = None;
    let mut found = 0usize;

    if needle.len() > haystack.len() {
        match_index = None;
    } else {
        for i in 0..=(haystack.len() - needle.len()) {
            if &haystack[i..i + needle.len()] == needle {
                found += 1;
                if found == occurrence {
                    match_index = Some(i);
                    break;
                }
            }
        }
    }

    let match_index = match match_index {
        Some(idx) => idx,
        None => {
            return Err(format!(
                "--find text not found (occurrence={}): {}",
                occurrence,
                find
            ))
        }
    };

    let before = &text[..match_index];
    let line_number = before.bytes().filter(|b| *b == b'\n').count() + 1;
    let last_newline = before.rfind('\n');
    let character_number = match last_newline {
        Some(pos) => match_index - pos,
        None => match_index + 1,
    };

    Ok(Some((line_number, character_number)))
}

struct LspClient {
    child: Child,
    stdin: ChildStdin,
    stdout: BufReader<ChildStdout>,
    next_id: i64,
}

impl LspClient {
    fn new(mut child: Child) -> Result<Self, String> {
        let stdin = child.stdin.take().ok_or("Failed to open LSP stdin")?;
        let stdout = child.stdout.take().ok_or("Failed to open LSP stdout")?;
        Ok(Self {
            child,
            stdin,
            stdout: BufReader::new(stdout),
            next_id: 1,
        })
    }

    fn send(&mut self, payload: &Value) -> Result<(), String> {
        let body = serde_json::to_vec(payload).map_err(|e| e.to_string())?;
        let header = format!("Content-Length: {}\r\n\r\n", body.len());
        self.stdin
            .write_all(header.as_bytes())
            .map_err(|e| e.to_string())?;
        self.stdin.write_all(&body).map_err(|e| e.to_string())?;
        self.stdin.flush().map_err(|e| e.to_string())?;
        Ok(())
    }

    fn read_message(&mut self) -> Result<Value, String> {
        let mut content_length: Option<usize> = None;
        loop {
            let mut line = String::new();
            let read = self.stdout.read_line(&mut line).map_err(|e| e.to_string())?;
            if read == 0 {
                return Err("LSP stdout closed".to_string());
            }
            let trimmed = line.trim_end_matches(&['\r', '\n'][..]);
            if trimmed.is_empty() {
                break;
            }
            if let Some(rest) = trimmed.strip_prefix("Content-Length:") {
                let value = rest.trim();
                let len = value.parse::<usize>().map_err(|_| "Invalid Content-Length")?;
                content_length = Some(len);
            }
        }

        let len = content_length.ok_or("Missing Content-Length")?;
        let mut buf = vec![0u8; len];
        self.stdout.read_exact(&mut buf).map_err(|e| e.to_string())?;
        serde_json::from_slice(&buf).map_err(|e| e.to_string())
    }

    fn request(&mut self, method: &str, params: Value) -> Result<Value, String> {
        let id = self.next_id;
        self.next_id += 1;
        let payload = json!({
            "jsonrpc": "2.0",
            "id": id,
            "method": method,
            "params": params
        });
        self.send(&payload)?;

        loop {
            let msg = self.read_message()?;
            if msg.get("id") == Some(&Value::from(id)) {
                if let Some(err) = msg.get("error") {
                    return Err(err.to_string());
                }
                return Ok(msg.get("result").cloned().unwrap_or(Value::Null));
            }
        }
    }

    fn notify(&mut self, method: &str, params: Value) -> Result<(), String> {
        let payload = json!({
            "jsonrpc": "2.0",
            "method": method,
            "params": params
        });
        self.send(&payload)
    }

    fn shutdown(&mut self) {
        let _ = self.request("shutdown", Value::Null);
        let _ = self.notify("exit", Value::Null);
        let _ = self.child.kill();
    }
}

fn normalize_locations(result: Value) -> Vec<Value> {
    match result {
        Value::Null => Vec::new(),
        Value::Array(items) => items
            .into_iter()
            .filter_map(|item| {
                if item.get("targetUri").is_some() && item.get("targetRange").is_some() {
                    Some(json!({
                        "uri": item.get("targetUri").cloned().unwrap_or(Value::Null),
                        "range": item.get("targetRange").cloned().unwrap_or(Value::Null)
                    }))
                } else if item.get("uri").is_some() && item.get("range").is_some() {
                    Some(item)
                } else {
                    None
                }
            })
            .collect(),
        other => vec![other],
    }
}

fn main() {
    let args = match parse_args() {
        Ok(args) => args,
        Err(err) => {
            eprintln!("{err}");
            std::process::exit(1);
        }
    };

    if args.help {
        print_help();
        return;
    }

    let file = match args.file {
        Some(file) => file,
        None => {
            print_help();
            std::process::exit(2);
        }
    };

    let text = match fs::read_to_string(&file) {
        Ok(text) => text,
        Err(err) => {
            eprintln!("{err}");
            std::process::exit(1);
        }
    };

    let position = match resolve_position(
        &text,
        args.line,
        args.character,
        args.find.as_deref(),
        args.occurrence,
    ) {
        Ok(Some(pos)) => pos,
        Ok(None) => {
            print_help();
            std::process::exit(2);
        }
        Err(err) => {
            eprintln!("{err}");
            std::process::exit(1);
        }
    };

    let root_uri = match to_file_uri(&args.root) {
        Ok(uri) => uri,
        Err(err) => {
            eprintln!("{err}");
            std::process::exit(1);
        }
    };
    let file_uri = match to_file_uri(&file) {
        Ok(uri) => uri,
        Err(err) => {
            eprintln!("{err}");
            std::process::exit(1);
        }
    };

    let mut command = Command::new(&args.server);
    command
        .args(&args.server_args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .current_dir(&args.root);

    let child = match command.spawn() {
        Ok(child) => child,
        Err(err) => {
            eprintln!("{err}");
            std::process::exit(1);
        }
    };

    let mut client = match LspClient::new(child) {
        Ok(client) => client,
        Err(err) => {
            eprintln!("{err}");
            std::process::exit(1);
        }
    };

    let init_params = json!({
        "processId": std::process::id(),
        "rootUri": root_uri,
        "capabilities": {},
        "clientInfo": {
            "name": "ts-lsp-goto-definition",
            "version": "1.0.0"
        }
    });

    if client.request("initialize", init_params).is_err() {
        client.shutdown();
        std::process::exit(1);
    }
    let _ = client.notify("initialized", json!({}));

    let did_open_params = json!({
        "textDocument": {
            "uri": file_uri,
            "languageId": guess_language_id(&file),
            "version": 1,
            "text": text
        }
    });
    let _ = client.notify("textDocument/didOpen", did_open_params);

    let definition_params = json!({
        "textDocument": {"uri": file_uri},
        "position": {"line": position.0 - 1, "character": position.1 - 1}
    });

    let result = match client.request("textDocument/definition", definition_params) {
        Ok(result) => result,
        Err(err) => {
            eprintln!("{err}");
            client.shutdown();
            std::process::exit(1);
        }
    };

    let locations = normalize_locations(result);
    println!("{}", serde_json::to_string_pretty(&Value::Array(locations)).unwrap_or_else(|_| "[]".to_string()));
    client.shutdown();
}
