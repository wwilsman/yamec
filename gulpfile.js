var gulp        = require('gulp');
var sourcemaps  = require('gulp-sourcemaps');
var source      = require('vinyl-source-stream');
var buffer      = require('vinyl-buffer');
var browserify  = require('browserify');
var watchify    = require('watchify');
var to5ify      = require('6to5ify');
var browserSync = require('browser-sync');
var uglify      = require('gulp-uglify');
var sass        = require('gulp-sass');
var rename      = require('gulp-rename');
var reload      = browserSync.reload;
var watch       = false;

gulp.task('browserify-watch', function () {
  watch = true;
});

gulp.task('browserify', function () {
  var b = browserify('./src/js/editor.js', {
    cache: {},
    packageCache: {},
    fullPaths: true,
    debug: true
  });

  var bundle = function() {
    return b
      .transform(to5ify)
      .bundle()
      .pipe(source('editor.js'))
      .pipe(buffer())
      .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(uglify())
      .pipe(sourcemaps.write())
      .pipe(gulp.dest('./dist'))
      .pipe(reload({ stream: true }));
  };

  if (watch) {
    b = watchify(b)
    b.on('update', bundle);
  }

  return bundle();
});

gulp.task('watchify', ['browserify-watch', 'browserify']);

gulp.task('browserSync', function () {
  browserSync({
    server: {
      baseDir: './examples',
      directory: true,
      routes: {
        '/dist': './dist'
      }
    },
    notify: false,
    open: false
  });
})

gulp.task('sass', function () {
  return gulp.src('./src/scss/main.scss')
    .pipe(sourcemaps.init())
      .pipe(sass())
    .pipe(sourcemaps.write())
    .pipe(rename('editor.css'))
    .pipe(gulp.dest('./dist'))
    .pipe(reload({ stream: true }));
});

gulp.task('reload', function () {
  reload();
});

gulp.task('watch', ['watchify', 'browserSync'], function() {
  gulp.watch('./src/scss/*.scss', ['sass']);
  gulp.watch('./examples/*', ['reload']);
});
