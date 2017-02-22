var gulp = require('gulp');
//Load gulp plugins from package.json and attach them to one object, eg:plugins.uglify()
var gulpLoadPlugins = require('gulp-load-plugins');
var plugins = gulpLoadPlugins();

var sass = require('gulp-sass');
var browserSync = require('browser-sync').create();
var useref = require('gulp-useref');
var uglify = require('gulp-uglify');
var gulpIf = require('gulp-if');
var cssnano = require('gulp-cssnano');
var concat = require('gulp-concat');
var imagemin = require('gulp-imagemin');
var cache = require('gulp-cache');
var del = require('del');
var runSequence = require('run-sequence');
var child = require('child_process');
var gutil = require('gulp-util');
var ts = require('gulp-typescript');
var browserify = require("browserify");
var source = require('vinyl-source-stream');
var tsify = require("tsify");
var watchify = require("watchify");

var conf = {
	path: {
		src: 'app',
		dest: 'site'
	},
	jekyll: {
		config: '_config.yml'
	}
};

//Read ts config info from tsconfig.json
var tsProject = ts.createProject(conf.path.src + '/tsconfig.json');

//Compile sass to css
gulp.task('sass',function(){
	return gulp.src('sass/main.scss')
		.pipe(sass())
		.pipe(gulp.dest(conf.path.src + '/css'))
		.pipe(browserSync.reload({
			stream: true
		}))
});

//Compile ts to js
gulp.task('typescript', function () {
    return tsProject.src()
        .pipe(tsProject())
        .js.pipe(gulp.dest(conf.path.src + '/js'));
});

//1.Bundle some ts to one js, like webpack
gulp.task('tsbundle',function(){
	return browserify({
        basedir: '.',
        debug: true,
        entries: [conf.path.src + '/ts/ts.ts'],
        cache: {},
        packageCache: {}
    })
    .plugin(tsify)
    .bundle()
    .pipe(source('bundle.js'))
    .pipe(gulp.dest(conf.path.src + '/js'));
});
gulp.task('bundle', ['tsbundle']);

//2.Bundle some ts to one js
var watchedBrowserify = watchify(browserify({
    basedir: '.',
    debug: true,
    entries: [conf.path.src + '/ts/ts.ts'],
    cache: {},
    packageCache: {}
}).plugin(tsify));

function bundle() {
    return watchedBrowserify
        .bundle()
        .pipe(source('bundle.js'))
        .pipe(gulp.dest(conf.path.src + '/js'));
}
gulp.task('bundle', bundle);
watchedBrowserify.on("update", bundle);
watchedBrowserify.on("log", gutil.log);

//Minify css and js in html
gulp.task('useref', function(){
	return gulp.src((conf.path.src + '/**/*.html'))
		.pipe(useref())
		// Minifies only if it's a JavaScript file: <!--build:js js/main.min.js --><!--endbuild-->
		.pipe(gulpIf('*.js', uglify()))
		// Minifies only if it's a CSS file: <!--build:css css/main.min.css--><!--endbuild-->
		.pipe(gulpIf('*.css', cssnano()))
		.pipe(gulp.dest(conf.path.dest))
});

//Copy images to dest and cache
gulp.task('images',function(){
	return gulp.src(conf.path.src + '/images/**/*.+(png|jpg|gif|svg)')
		.pipe(cache(imagemin({
			// Setting interlaced to true
			interlaced: true
		})))
		.pipe(gulp.dest(conf.path.dest + '/images'))
});

//Copy fonts to dest
gulp.task('fonts', function() {
  return gulp.src(conf.path.src + '/fonts/**/*')
  .pipe(gulp.dest(conf.path.dest + '/fonts'))
});

//Copy html to dest
gulp.task('html', function() {
  return gulp.src(conf.path.src + '/**/*.html')
  .pipe(gulp.dest(conf.path.dest))
});

//Clean site folder
gulp.task('clean:site',function(){
	//delete folder
	return del.sync(conf.path.dest);
});

//Clean cache
gulp.task('cache:clear', function (callback) {
	return cache.clearAll(callback);
});

//Build jekyll server
gulp.task('jekyll', function(done){
  var jekyll = child.exec('jekyll build', [
  '--source=' + conf.path.src, 
  '--destination=' + conf.path.dest,
  '--config=' + conf.jekyll.config
  ]).on('close', function(){
  	  
  });

  var jekyllLogger = (buffer) => {
    buffer.toString()
      .split(/\n/)
      .forEach((message) => gutil.log('Jekyll: ' + message));
  };

  //jekyll.stdout.on('data', jekyllLogger);
  //jekyll.stderr.on('data', jekyllLogger);  
});

//Start browser
gulp.task('browserSync', function(callback){
	browserSync.init({
	    files: [conf.path.src + '/**/*'],
	    port: 8001,
	    server: {
	      baseDir: conf.path.src
	    }
  	});
  	runSequence(['watch'],callback);
});

gulp.task('serve',['browserSync']);

gulp.task('build', function (callback) {
  runSequence('clean:site',['sass','tsbundle'],callback);
});

//Watch files
gulp.task('watch', function(){
	gulp.watch('sass/**/*.scss', ['sass']);
	//gulp.watch('ts/**/*.ts', ['tsbundle']);
	//Reloads the browser whenever HTML or JS files change
	//gulp.watch(conf.path.src + '/**/*.html', browserSync.reload);
	//gulp.watch(conf.path.src + '/**/*.js', browserSync.reload);
	
});

//Mini CSS and JS files to site
gulp.task('pack', function (callback) {
  runSequence('clean:site',['images','fonts','html','useref'],callback);
});
