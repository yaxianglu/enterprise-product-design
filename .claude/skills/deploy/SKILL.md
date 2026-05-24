---
name: deploy
description: Use when deploying enterprise-quiz (企业智能题库) on the maintainer machine. Process mode only — never Docker.
---

# Enterprise Quiz Deploy Workflow

Read [references/current-runtime.md](./references/current-runtime.md) before touching live services.

## Workflow

### 1. Inspect current state

```bash
git status
lsof -nP -iTCP -sTCP:LISTEN | grep -E "8004|3004|5177"
```

Note what's already running. Never kill nginx or cloudflared.

### 2. Update code

```bash
# Check for uncommitted changes first
git status

git pull

# If web dependencies changed:
npm --prefix apps/web install

# If agent dependencies changed:
cd apps/agent && uv sync && cd ../..
```

### 3. Bump version — web and agent must stay in sync

```bash
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ working tree 不干净，请先 commit 再发布"; exit 1
fi

CURRENT=$(node -p "require('./apps/web/package.json').version")
NEW=$(node -p "const [a,b,c]='$CURRENT'.split('.').map(Number); \`\${a}.\${b}.\${c+1}\`")
echo "Bumping $CURRENT → $NEW"

node -e "
  const fs=require('fs'), p='./apps/web/package.json';
  const pkg=JSON.parse(fs.readFileSync(p));
  pkg.version='$NEW';
  fs.writeFileSync(p, JSON.stringify(pkg,null,2)+'\n');
"
sed -i '' "s/^version = \".*\"/version = \"$NEW\"/" apps/agent/pyproject.toml

git add apps/web/package.json apps/agent/pyproject.toml
git commit -m "chore: bump version to $NEW"
```

### 4. Rebuild web

```bash
npm --prefix apps/web run build
```

### 5. Restart services

```bash
bash scripts/dev/start-agent.sh
sleep 2
bash scripts/dev/start-web.sh
sleep 3
```

### 6. 验活

```bash
EXPECTED=$(node -p "require('./apps/web/package.json').version")

smoke() {
  local label=$1 base_web=$2 base_agent=$3
  echo ""; echo "══ 验活: $label ══"

  # Agent health
  if [ "$base_agent" != "skip" ]; then
    AGENT_VER=$(curl -fsS "$base_agent/api/v1/health" 2>/dev/null \
      | python3 -c 'import json,sys; print(json.load(sys.stdin).get("version","?"))' 2>/dev/null || echo "err")
    echo "  agent: $AGENT_VER"
  fi

  # Login smoke
  TOKEN=$(curl -fsS -X POST "$base_web/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d '{"username":"demo","password":"demo1234"}' \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("username",""))' 2>/dev/null)
  [ "$TOKEN" = "demo" ] || { echo "❌ 登录失败"; return 1; }

  echo "  ✓ $label 验活通过"
}

smoke "localhost"        "http://localhost:3004" "http://localhost:8004"
smoke "quiz.luyaxiang.com" "https://quiz.luyaxiang.com" "skip"
```

## Quick Reference

- Repo: `/Users/mac/Desktop/code/ai-demos/enterprise-quiz`
- Start agent: `bash scripts/dev/start-agent.sh`
- Start web: `bash scripts/dev/start-web.sh`
- Agent log: `~/.doc-cloud/logs/enterprise-quiz-backend.log`
- Web log: `~/.doc-cloud/logs/enterprise-quiz-frontend.log`
- Local login: `http://localhost:3004`
- Live: `https://quiz.luyaxiang.com`

## Common Mistakes

- Forgetting `JWT_SECRET` — always use `start-web.sh`, never start node directly
- Killing all node processes — only kill the specific PID from `.runtime/web.pid`
- Skipping the login smoke test after deploy
