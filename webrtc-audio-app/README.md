


/var/www/webrtc-audio-app/
├── client/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── server/
│   ├── package.json
│   ├── server.js
│   ├── config.js
│   ├── .env
│   ├── database/
│   │   ├── db.js
│   │   ├── models.js
│   │   └── init.js
│   ├── routes/
│   │   ├── api.js
│   │   └── recordings.js
│   ├── utils/
│   │   ├── recording.js
│   │   └── helpers.js
│   └── storage/
│       └── recordings/



Client Browser (WebRTC) ↔ Socket.IO ↔ Node.js Server ↔ PostgreSQL Database
       ↑                             ↑                  ↑
       |                             |                  |
Media Streams                 Signaling Messages    Room & User Data





Client A (Offerer)           Signaling Server          Client B (Answerer)
     |                            |                            |
     |--- create-offer -------->|                            |
     |                            |--- offer --------------->|
     |                            |                            |--- create-answer -->|
     |                            |<-- answer ----------------|
     |<-- answer ----------------|                            |
     |--- set-remote-desc ------>|                            |
     |                            |                            |
     |--- ice-candidate -------->|                            |
     |                            |--- ice-candidate -------->|
     |                            |                            |--- add-ice-candidate ->|




1. First User - Create Room
Website open करें: https://web.chatmybot.in

"Start Audio" button click करें

Browser microphone permission allow करें

Audio visualizer move होना start हो जाएगा

Room name enter करें: जैसे test-room

"Create Room" button click करें

Status: "Created room: test-room. Share this name with others." show होगा

2. Second User - Join Room
दूसरे device पर same website open करें: https://web.chatmybot.in

"Start Audio" button click करें

Microphone permission allow करें

Same room name enter करें: test-room

"Join Room" button click करें





-----------------------------------------------------------------------



---------------------------------------------------------------------------------------------


sudo apt update && sudo apt upgrade -y

sudo apt install -y curl wget git build-essential libssl-dev libpq-dev
sudo apt install postgresql postgresql-contrib


# Create database and user
sudo -u postgres psql
CREATE DATABASE webrtc_app;
CREATE USER webrtc_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE webrtc_app TO webrtc_user;



curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

sudo apt install -y nginx

sudo systemctl start nginx

sudo systemctl enable nginx

sudo npm install -g pm2

pm2 startup

sudo apt install -y certbot python3-certbot-nginx tree

sudo apt install -y alsa-utils libasound2-dev pulseaudio pulseaudio-utils

sudo modprobe snd-dummy

sudo modprobe snd-aloop

echo "snd-dummy" | sudo tee -a /etc/modules

echo "snd-aloop" | sudo tee -a /etc/modules

sudo mkdir -p /var/www/webrtc-audio-app

sudo chown -R $USER:$USER /var/www/webrtc-audio-app


mkdir -p /var/www/webrtc-video-app/server/database
mkdir -p /var/www/webrtc-video-app/server/routes
mkdir -p /var/www/webrtc-video-app/server/storage/recordings


chmod 755 /var/www/webrtc-video-app/server/storage
chmod 755 /var/www/webrtc-video-app/server/storage/recordings

cd /var/www/webrtc-audio-app

mkdir -p client server nginx scripts

mkdir client

vim index.html

vim style.css

vim script.js

mkdir server

vim package.json

vim server.js


cd /var/www/webrtc-audio-app/server

npm install

---------------

vim /etc/nginx/sites-available/webrtc-audio-app
server {
    listen 80;
    server_name web.chatmybot.in _;
    # using "_" makes nginx respond to requests by IP too

    # Serve static files from client directory
    root /var/www/webrtc-audio-app/client;
    index index.html;

    # Main location - serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API and Socket.IO proxy to Node.js server
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # WebSocket specific settings
        proxy_set_header Connection "Upgrade";
        proxy_read_timeout 86400;
    }

    # Proxy other API calls if needed
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}


----------------

sudo ln -s /etc/nginx/sites-available/webrtc-audio-app /etc/nginx/sites-enabled/

sudo rm /etc/nginx/sites-enabled/default

sudo nginx -t

sudo systemctl reload nginx

sudo certbot --nginx -d web.chatmybot.in




---------------

vim /etc/nginx/sites-available/webrtc-audio-app
server {
    server_name web.chatmybot.in;
    
    # SSL configuration - Certbot managed
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/web.chatmybot.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/web.chatmybot.in/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Serve static files from client directory
    root /var/www/webrtc-audio-app/client;
    index index.html;

    # Main location - serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API and Socket.IO proxy to Node.js server
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # WebSocket specific settings
        proxy_set_header Connection "Upgrade";
        proxy_read_timeout 86400;
    }

    # Proxy other API calls if needed
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    # HTTP to HTTPS redirect
    listen 80;
    server_name web.chatmybot.in;
    return 301 https://$server_name$request_uri;
}

----------------




cd /var/www/webrtc-audio-app/server

# Create .env file
cat > .env << EOL
PORT=3000
NODE_ENV=production
DB_HOST=localhost
DB_PORT=5432
DB_NAME=webrtc_app
DB_USER=webrtc_user
DB_PASSWORD=your_password
MAX_USERS_PER_ROOM=5
EOL


npm run init-db


pm2 start server.js --name webrtc-audio-app

pm2 save

pm2 startup

sudo apt install -y linux-modules-extra-$(uname -r) alsa-utils

sudo modprobe snd-dummy

sudo modprobe snd-aloop


lsmod | grep snd

aplay -l


# Create and add this file
vim /etc/asound.conf
pcm.!default {
    type plug
    slave.pcm "dummy"
}



sudo apt install -y pulseaudio pulseaudio-utils


# Create and add this file
sudo vim /etc/pulse/default.pa
load-module module-null-sink sink_name=virtual_sink                                #Add This line
load-module module-virtual-source source_name=virtual_mic                          #Add This line



speaker-test -t wav -c 2


pm2 start server.js --name webrtc-audio-app

# add this file
vim /etc/hosts
127.0.0.1 localhost 13.235.45.137 web.chatmybot.in



systemctl restart systemd-resolved


pm2 restart webrtc-audio-app


############## IF ANY PROBLEM THEN RUN BELOW COMMAND ############################


# Check PostgreSQL status
sudo systemctl status postgresql

# Verify connection settings
psql -h localhost -U webrtc_user -d webrtc_app


\dt
SELECT * FROM rooms;




# Grant Necessary Privileges
sudo -u postgres psql << EOF
\c webrtc_app;
GRANT ALL ON SCHEMA public TO webrtc_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO webrtc_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO webrtc_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO webrtc_user;
EOF


# Alternative: Recreate Database with Proper Privileges

# Drop and recreate database with proper owner
sudo -u postgres psql << EOF
DROP DATABASE IF EXISTS webrtc_app;
CREATE DATABASE webrtc_app OWNER webrtc_user;
\c webrtc_app;
GRANT ALL ON SCHEMA public TO webrtc_user;
EOF











# Open Port

# ✅ Security Group
resource "aws_security_group" "webrtc_sg" {
  vpc_id = aws_vpc.main.id
  name   = "webrtc-sg"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 3478
    to_port     = 3478
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }


  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 49152
    to_port     = 65535
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}



















