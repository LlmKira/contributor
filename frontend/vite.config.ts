import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
// @ts-ignore
import path from 'path'
// @ts-ignore
import dotenv from 'dotenv'
import compression from 'vite-plugin-compression'

dotenv.config({path: path.resolve(__dirname, '../.env')});  // 确保正确读取.env文件

export default defineConfig({
    plugins: [react(), compression()],
    root: path.resolve(__dirname),  // 设置根目录
    publicDir: path.resolve(__dirname, 'public'),  // 公共目录用于静态资源
    build: {
        minify: 'terser',
        rollupOptions: {
            input: path.resolve(__dirname, 'index.html')  // 指定入口文件
        }
    },
    resolve: {
        alias: {
            '@shared': path.resolve(__dirname, '../shared')
        }
    },
    server: {
        port: 3000,
        proxy: {
            '/auth': {
                target: process.env.VITE_BACKEND_URL,
                changeOrigin: true,
                secure: false,
            },
            '/user': {
                target: process.env.VITE_BACKEND_URL,
                changeOrigin: true,
                secure: false,
            }
        }
    }
})
