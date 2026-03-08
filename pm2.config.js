module.exports = {
  apps: [
    {
      name: 'ruby',
      script: 'npm run start',
      //      instances: "max",
      autorestart: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
