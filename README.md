# migration-framework

A barebones, generic migration framework

# usage

```sh
$ npm i --save migration-framework
$ npm i --save grunt-prompt # grunt cannot do recursion
```

`config/default.json`:

```json
{
  "migrationFramework": {
    "migrationDir": "/path/to/project/migrations",
    "migrationFilename": ".migrate"
  }
}
```

`Gruntfile.js`

```javascript
module.exports = function (grunt) {
  require('migration-framework/Gruntfile')(grunt);
};
```
