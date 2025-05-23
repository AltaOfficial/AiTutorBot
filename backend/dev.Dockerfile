FROM python:3.12-alpine AS builder

WORKDIR /app

RUN apk add freetype libjpeg-turbo

COPY requirements.txt /app
RUN if [ -f requirements.txt ]; then pip install -r requirements.txt; \
    else echo "requirements.txt not found" && exit 1; \
    fi

COPY . .

CMD ["python", "-u", "app.py"]