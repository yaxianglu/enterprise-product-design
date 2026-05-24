# Current Runtime Topology

## Canonical Paths

- Repo root: `/Users/mac/Desktop/code/ai-demos/enterprise-product-design`
- Nginx config: `/Users/mac/.doc-cloud/config/product-design-luyaxiang.nginx.conf`

## Domain Chain

1. `cloudflared` routes `productDesign.luyaxiang.com` → `127.0.0.1:5187`
2. `nginx` on `127.0.0.1:5187`
3. Next.js web on `127.0.0.1:3014`
4. Python agent on `127.0.0.1:8010`

## Notes

- Web port: **3014**
- Agent port: **8010**
- Never Docker for this project — process mode only
- Nginx config template: see `infra/nginx/product-design-luyaxiang.nginx.conf`
