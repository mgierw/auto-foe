module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
		ts: {
			default: {
				src: ['./ts/*.ts'],
				outDir: './ts/target',
				options: {
					module: 'commonjs',
					target: 'es6',
					sourceMap: false
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-ts');
};