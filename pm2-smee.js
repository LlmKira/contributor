require('dotenv').config();  // 加载 .env 文件中的环境变量

module.exports = {
    apps: [{
        name: "smee_proxy",
        script: "smee",
        args: `--url ${process.env.PROXY_WEBHOOK_URL} -t http:127.0.0.1:8888`,
        instances: 1,
        max_restarts: 3,
        restart_delay: 10000,
        exp_backoff_restart_delay: 100,
        error_file: "error.log",
        out_file: "/dev/null",
        log_date_format: "YYYY-MM-DD HH-mm-ss"
    }, {
        "name": "contributor",
        "script": "sleep 3&&pdm run python main.py",
        "instances": 1,
        "max_restarts": 3,
        "restart_delay": 10000,
        "exp_backoff_restart_delay": 100,
        "error_file": "error.log",
        "out_file": "/dev/null",
        "log_date_format": "YYYY-MM-DD HH-mm-ss"
    }]
};