'use strict';

module.exports = function(grunt) {
  // Force use of Unix newlines
  grunt.util.linefeed = '\n';

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    banner: '/*!\n' +
            ' * HTMLLint v<%= pkg.version %> (<%= pkg.homepage %>)\n' +
            ' * Copyright 2010-<%= grunt.template.today("yyyy") %> <%= pkg.author %>\n' +
            ' * Licensed under the <%= pkg.license %> license\n' +
            ' */\n',

    browserify: {
      src: {
        options: {
          banner: '<%= banner %>',
          require: [
            './src/htmllint.js:html-minifier-lint'
          ]
        },
        src: 'src/htmllint.js',
        dest: 'dist/htmllint.js'
      }
    },

    eslint: {
      grunt: {
        src: 'Gruntfile.js'
      },
      src: {
        src: 'src/**/*.js'
      },
      tests: {
        src: ['tests/*.js', 'test.js']
      },
      web: {
        src: 'assets/master.js'
      }
    },

    qunit: {
      htmllint: ['./tests/lint', 'tests/index.html']
    },

    replace: {
      './index.html': [
        /(<h1>.*?<span>).*?(<\/span><\/h1>)/,
        '$1(v<%= pkg.version %>)$2'
      ],
      './tests/index.html': [
        /("[^"]+\/qunit-)[0-9\.]+?(\.(?:css|js)")/g,
        '$1<%= pkg.devDependencies.qunitjs %>$2'
      ]
    },

    uglify: {
      options: {
        banner: '<%= banner %>',
        compress: true,
        mangle: true,
        preserveComments: false,
        report: 'min'
      },
      minify: {
        files: {
          'dist/htmllint.min.js': '<%= browserify.src.dest %>'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-eslint');

  function report(type, details) {
    grunt.log.writeln(type + ' completed in ' + details.runtime + 'ms');
    details.failures.forEach(function(details) {
      grunt.log.error();
      grunt.log.error(details.name);
      grunt.log.error(details.source);
      grunt.log.error('Actual:');
      grunt.log.error(details.actual);
      grunt.log.error('Expected:');
      grunt.log.error(details.expected);
    });
    grunt.log[details.failed ? 'error' : 'ok'](details.passed + ' of ' + details.total + ' passed, ' + details.failed + ' failed');
    return details.failed;
  }

  var phantomjs = require('phantomjs-prebuilt').path;
  grunt.registerMultiTask('qunit', function() {
    var done = this.async();
    var errors = [];

    function run(testType, binPath, testPath) {
      grunt.util.spawn({
        cmd: binPath,
        args: ['test.js', testPath]
      }, function(error, result) {
        if (error) {
          grunt.log.error(result.stderr);
          grunt.log.error(testType + ' test failed to load');
          errors.push(-1);
        }
        else {
          errors.push(report(testType, JSON.parse(result.stdout)));
        }
        if (errors.length === 2) {
          done(!errors[0] && !errors[1]);
        }
      });
    }

    run('node', process.argv[0], this.data[0]);
    run('web', phantomjs, this.data[1]);
  });

  grunt.registerMultiTask('replace', function() {
    var pattern = this.data[0];
    var path = this.target;
    var html = grunt.file.read(path);
    html = html.replace(pattern, this.data[1]);
    grunt.file.write(path, html);
  });

  grunt.registerTask('dist', [
    'replace',
    'browserify',
    'uglify'
  ]);

  grunt.registerTask('test', [
    'eslint',
    'dist',
    'qunit'
  ]);

  grunt.registerTask('default', 'test');
};
