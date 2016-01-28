// https://github.com/lorenwest/node-config/wiki/Sub-Module-Configuration
process.env.SUPPRESS_NO_CONFIG_WARNING = 'y'
var config = require('config')

var async = require('async')
var path = require('path')
var glob = require('glob')
var fs = require('fs')
var mkdirp = require('mkdirp')
var _ = require('lodash')

// https://github.com/lorenwest/node-config/wiki/Sub-Module-Configuration
config.util.setModuleDefaults('migrationFramework', {
  migrationDir: path.join(__dirname, 'migrations'),
  migrationFilename: '.migrate',
})

var migrationDir = config.get('migrationFramework.migrationDir')
var migrationFilename = config.get('migrationFramework.migrationFilename')

var migrationFile = path.join(migrationDir, migrationFilename)

function getLast (cb) {
  fs.readFile(migrationFile, 'utf8', function (err, last) {
    if (!err) { return cb(null, last) }
    if (err.code === 'ENOENT') { return cb(null, null) }
    cb(err)
  })
}

function setLast (last, cb) {
  mkdirp(migrationDir, function (err) {
    if (err) { return cb(err) }
    fs.writeFile(migrationFile, (last || ''), cb)
  })
}

function migrate (direction, cb, finalCb) {
  var _this = this

  var dir = path.join(migrationDir, '*.{coffee,js}')
  glob(dir, function (err, files) {
    if (err) { return finalCb(err) }

    files.sort()
    if (direction === 'down') { files = _(files).reverse().value() }

    getLast(function (err, last) {
      if (err) { return finalCb(err) }

      // if no last migration, run from start
      if (!last) { return runMigration.call(_this, files, 0, direction, cb, finalCb) }

      // find index of last migration and run from there
      var index = _.map(files, function (file) { return path.basename(file) }).indexOf(last)

      // if not found, exit
      if (last === -1) { return finalCb() }

      // upward migration should start *after* last migration
      if (direction === 'up') { index++ }

      runMigration.call(_this, files.slice(index), 0, direction, cb, finalCb)
    })
  })
}

function runMigration (files, index, direction, cb, finalCb) {
  var _this = this

  // if we have finished migrating all files, exit
  if (index > files.length - 1) { return finalCb() }

  // load and fire next migration file
  try {
    var basename = path.basename(files[index])
    var migration = require(files[index])

    if (!migration[direction]) {
      return finalCb(new Error('Migration function ' + direction + '() not defined: ' + basename))
    }

    migration[direction](function (err) {
      if (err) { return finalCb(err) }

      // store last migration info
      var last = files[direction === 'up' ? index : index + 1]
      last = last ? path.basename(last) : null
      setLast(last, function (err) {
        if (err) { return finalCb(err) }

        cb(basename)

        // on completing current migration, launch next
        runMigration.call(_this, files, index + 1, direction, cb, finalCb)
      })
    })
  } catch (e) {
    finalCb(e)
  }
}

function create (name, cb) {
  name = _.kebabCase(_.deburr(name))
  var filename = '' + Date.now() + '-' + name + '.js'
  var pathname = path.join(migrationDir, filename)
  var template = path.join(__dirname, 'migration-template.js')
  async.waterfall([
    function (cb) { mkdirp(migrationDir, cb) },
    function (dir, cb) { fs.readFile(template, 'utf8', cb) },
    function (data, cb) { fs.writeFile(pathname, data, cb) },
  ], function (err) {
    cb(err, filename)
  })
}

module.exports = {
  up: function (cb, finalCb) { migrate.call(this, 'up', cb, finalCb) },
  down: function (cb, finalCb) { migrate.call(this, 'down', cb, finalCb) },
  create: create,
}
