module.exports = function (grunt) {
  var migration = require('./index')

  grunt.loadNpmTasks('grunt-prompt')

  grunt.initConfig({
    prompt: {
      migrate: {
        options: {
          questions: [
            {
              config: 'migrationName',
              type: 'input',
              message: 'Migration name',
              'default': 'unnamed',
            }
          ]
        }
      }
    }
  })

  grunt.registerTask('migrate:up', 'Migrate database up', function() {
    var done = this.async()
    var logger = function (eachMigration) { grunt.log.ok('Migration up ' + eachMigration) }
    migration.up(logger, function (err) {
      if (err) {
        grunt.log.error(err.message)
      } else {
        grunt.log.ok('Migration done')
      }
      done()
    })
  })

  grunt.registerTask('migrate:down', 'Migrate database down', function() {
    var done = this.async()
    var logger = function (eachMigration) { grunt.log.ok('Migration down ' + eachMigration) }
    migration.down(logger, function (err) {
      if (err) {
        grunt.log.error(err.message)
      } else {
        grunt.log.ok('Rollback done')
      }
      done()
    })
  })

  grunt.registerTask('migrate:reset', ['migrate:down', 'migrate:up'])

  grunt.registerTask('migrate:create:main', 'Create migration', function() {
    var done = this.async()
    migration.create(grunt.config('migrationName'), function (err, filename) {
      if (err) {
        grunt.log.error(err.message)
      } else {
        grunt.log.ok('Created ' + filename)
      }
      done()
    })
  })

  grunt.registerTask('migrate:create', ['prompt:migrate', 'migrate:create:main'])

  // rails style alias
  grunt.registerTask('migrate', ['migrate:up'])
  grunt.registerTask('rollback', ['migrate:down'])
}
