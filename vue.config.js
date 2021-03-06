module.exports = {
  configureWebpack: {
    devtool: 'source-map'
  },
  pluginOptions: {
    electronBuilder: {
      externals: ['@typedproject/gphoto2-driver/lib', '@typedproject/gphoto2-driver', '@typedproject', 'ref', 'ref-napi', 'ffi-napi', 'epoll', 'rpi-gpio'],
      
      chainWebpackMainProcess: config => {
        config.plugin('define').tap(args => {
          args[0]['process.env.FLUENTFFMPEG_COV'] = false
          return args
        })
      },
      chainWebpackRendererProcess: config => {
        console.log(config.toConfig().optimization.minimizer[0].options);
      },
    
      builderOptions: {
        // options placed here will be merged with default configuration and passed to electron-builder
        productName: "Power Booth",
        linux: {
          target: "AppImage",
        },
      },
      nodeModulesPath: './node_modules',
      // chainWebpackMainProcess: config => {
      //   config.module.rule('node').test(/\.node$/).use('node-loader').loader('node-loader')
      // },
    }
  }
}
