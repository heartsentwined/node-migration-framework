# https://github.com/lorenwest/node-config/wiki/Sub-Module-Configuration
process.env.SUPPRESS_NO_CONFIG_WARNING = 'y'
config = require 'config'

path = require 'path'
glob = require 'glob'
fs = require 'fs'
_ = require 'lodash'

# https://github.com/lorenwest/node-config/wiki/Sub-Module-Configuration
config.util.setModuleDefaults 'migrationFramework',
  migrationDir: path.join __dirname, 'migrations'
  migrationFilename: '.migrate'

migrationDir = config.get 'migrationFramework.migrationDir'
migrationFilename = config.get 'migrationFramework.migrationFilename'

migrationFile = path.join migrationDir, migrationFilename

getLast = (cb) ->
  fs.readFile migrationFile, 'utf8', (err, last) ->
    return cb null, last unless err
    return cb null, null if err.code == 'ENOENT'
    cb err

setLast = (last, cb) ->
  fs.writeFile migrationFile, (last || ''), cb

migrate = (direction, cb, finalCb) ->
  _this = this

  dir = path.join migrationDir, '*.{coffee,js}'
  glob dir, (err, files) ->
    return finalCB err if err

    files.sort()
    files = _(files).reverse().value() if direction == 'down'

    getLast (err, last) ->
      return finalCb err if err

      # if no last migration, run from start
      return runMigration.call _this, files, 0, direction, cb, finalCb unless last

      # find index of last migration and run from there
      index = _.map(files, path.basename).indexOf last

      # if not found, exit
      return finalCb() if last == -1

      # upward migration should start *after* last migration
      index++ if direction == 'up'

      runMigration.call _this, files.slice(index), 0, direction, cb, finalCb

runMigration = (files, index, direction, cb, finalCb) ->
  _this = this

  # if we have finished migrating all files, exit
  return finalCb() if index > files.length - 1

  # load and fire next migration file
  try
    basename = path.basename files[index]
    migration = require files[index]

    unless migration[direction]
      return finalCb new Error "Migration function #{direction}() not defined: #{basename}"

    migration[direction] (err) ->
      return finalCb err if err

      # store last migration info
      last = files[if direction == 'up' then index else index + 1]
      last = if last then path.basename last else null
      setLast last, (err) ->
        return finalCb err if err

        cb basename

        # on completing current migration, launch next
        runMigration.call _this, files, index + 1, direction, cb, finalCb

  catch e
    return finalCb e

create = (name, cb) ->
  name = _.kebabCase _.deburr name
  filename = "#{Date.now()}-#{name}.coffee"
  pathname = path.join migrationDir, filename
  template = path.join __dirname, 'migration-template.coffee'
  fs.readFile template, 'utf8', (err, data) ->
    return cb err if err
    fs.writeFile pathname, data, (err) -> cb err, filename

module.exports =
  up: (cb, finalCb) -> migrate.call this, 'up', cb, finalCb
  down: (cb, finalCb) -> migrate.call this, 'down', cb, finalCb
  create: create
