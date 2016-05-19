var gulp = require('gulp'),
    minifyHtml = require('gulp-minify-html'),
    templateCache = require('gulp-angular-templatecache');

var minifyHtmlOpts = {
    empty: true,
    cdata: true,
    conditionals: true,
    spare: true,
    quotes: true
};

gulp.task('bootstrap3', function () {
    gulp.src('template/bootstrap3/*.html')
        .pipe(minifyHtml(minifyHtmlOpts))
        .pipe(templateCache('opening-hours-tpls-bootstrap3.js', {standalone: true, module: 'opening.hours.templates'}))
        .pipe(gulp.dest('src'));
});

gulp.task('default', ['bootstrap3']);