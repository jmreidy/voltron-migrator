# Voltron-Migrator

[![Build Status](https://travis-ci.org/jmreidy/voltron-migrator.png)](https://travis-ci.org/jmreidy/voltron-migrator)

Voltron-Migrator is a tool for executing SQL migrations with Node. While it's
part of the Voltron.io framework, it's also a stand-alone component.
Voltron-Migrator is heavily modeled after [voodootikigod's migrator](http://github.com/voodootikigod/migrator);
in fact, the project started as a fork of voodootikigod's code.

## Purpose

Voltron-Migrator has two main purposes: generate SQL migrations, and execute them.
V-M allows both the application and reversion of migrations. Like Rails,
it creates a `schema_migrations` table in your database to track which
migrations have already been executed, and it prefixes generated
migration files with a timestamp of 'YYYYMMDDHHMMSS'.

Migrations are written in SQL and do not use an abstraction layer.

## Usage

Include Voltron.io or Voltron-Migration in your package.json file. If you
have `node_modules\.bin` in your path, just execute `migrate`. You can
provide database configuration in two ways:

1. via a configuration file that will be required. The config file must
return an object with a `database` property, which itself exposes a hash
of the following properties: name, host, port, type, user (optional),
password (optional).

2. via explicit values on the command line. The following properties
are required: name, host, port, type. User and password are optional.

V-M assumes that your migrations are included in `.\migrations`, but you
can change that via a CLI argument.

Running `migrate` on its own will execute migrations in order in the specified
source directory, skipping over migrations that have already been run. If
you supply `-r` or `--revert` as an argument, the migrations were be rolled back,
starting with the most recent migration and ignoring any migrations that
haven't yet been applied.

Running `migrate -g` or `migrate --generate` `<filename>` will create two
migration files of the specified filename: `<filename>_up.sql` and
`<filename>_down.sql`. As you can expect, `up` files are run when migrations
are executed, and `down` files are run when migrations are reverted.

## Support

Postgres is currently supported.

## Roadmap

* Add test coverage
* Implement MySQL
* Allow reversion by datestamp

## Development
In order to run the tests, you'll need to setup a database for Postgres
(`migrator_test`). See the config files in `test/fixtures` for details.

## License
The MIT License (MIT)
Copyright © 2012-3 Justin Reidy, http://rzrsharp.net

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the “Software”), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
