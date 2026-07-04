# Project Instructions

- For every new user request in this project, call the DeepSeek CLI first before making code changes or running the main task.
- Use the existing `DEEPSEEK_API_KEY` from the user environment. Do not print or expose the key.
- Prefer `deepseek -m deepseek-coder --no-stream --raw` for code review, debugging, implementation guidance, and patch generation.
- Set `PYTHONIOENCODING=utf-8` when running DeepSeek CLI to avoid console encoding failures.
- Ask DeepSeek to write the first implementation or fix patch. Codex should apply/recreate that patch, inspect the diff, run verification, and only request revised DeepSeek patches when verification fails.
- Codex may make only small mechanical adjustments without another DeepSeek call, such as fixing patch context, formatting, imports, or quoting paths.
- After Codex final-checks the DeepSeek changes and verification passes, commit and push to GitHub every time unless the user explicitly says not to.
- Before committing, run `git status` and review staged scope. Commit only files related to the current task; never stage or commit unrelated dirty files, secrets, local env files, logs, build artifacts, or generated dependency folders.
- If DeepSeek CLI is unavailable, rate-limited, missing an API key, or fails, report that briefly and continue with the best local analysis.
