# Project Instructions

- For every new user request in this project, call the DeepSeek CLI first before making code changes or running the main task.
- Use the existing `DEEPSEEK_API_KEY` from the user environment. Do not print or expose the key.
- Prefer `deepseek -m deepseek-coder --no-stream --raw` for code review, debugging, and implementation guidance.
- Set `PYTHONIOENCODING=utf-8` when running DeepSeek CLI to avoid console encoding failures.
- If DeepSeek CLI is unavailable, rate-limited, missing an API key, or fails, report that briefly and continue with the best local analysis.
