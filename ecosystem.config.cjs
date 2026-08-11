module.exports = {
  apps: [{
    name: 'poolboy',
    script: 'build/index.js',
    env: {
      DATABASE_URL: 'local.db'
    }
  }]
}
