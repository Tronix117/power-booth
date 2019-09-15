module.exports = {
  configureWebpack: {
    devtool: 'source-map'
  },
  pluginOptions: {
    electronBuilder: {
      externals: ['@typedproject/gphoto2-driver/lib', '@typedproject/gphoto2-driver', '@typedproject', 'ref', 'ref-napi', 'ffi-napi'],
      
      chainWebpackMainProcess: config => {
        config.plugin('define').tap(args => {
          args[0]['process.env.FLUENTFFMPEG_COV'] = false
          return args
        })
      },
    
      builderOptions: {
        // options placed here will be merged with default configuration and passed to electron-builder
      },
      nodeModulesPath: './node_modules',
      // chainWebpackMainProcess: config => {
      //   config.module.rule('node').test(/\.node$/).use('node-loader').loader('node-loader')
      // },
    }
  }
}
