FROM itruong/ubuntu_python3.7:latest

WORKDIR /manufacturingapp/
COPY . /manufacturingapp/

RUN apt-get update && apt-get install -y \
    gnupg2 \
    g++ \
    libssl1.0.0 \
    libssl-dev \
    unixodbc-dev

RUN curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - \
    && curl https://packages.microsoft.com/config/ubuntu/18.04/prod.list > /etc/apt/sources.list.d/mssql-release.list
RUN apt-get update && ACCEPT_EULA=Y apt-get install -y \
    msodbcsql17 

RUN pip3 install --trusted-host pypi.python.org -r requirements.txt
