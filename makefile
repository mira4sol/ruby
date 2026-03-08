.PHONY: deploy

deploy:
	git pull origin main
	pnpm build
	pm2 restart pm2.config.js

pgen:
	npx prisma generate

ppush:
	npx prisma db push

ppushf:
	npx prisma db push --force-reset

pstudio:
	npx prisma studio

.PHONY: run-script

run-script:
	@read -p "Script name (without extension): " script; \
	pnpx tsx "src/scripts/$$script.ts"