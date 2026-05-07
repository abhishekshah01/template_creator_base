FROM alpine:3.22
RUN apk add --no-cache restic git bash coreutils curl jq
COPY create_template_gcs.sh /usr/local/bin/create_template_gcs.sh
RUN chmod +x /usr/local/bin/create_template_gcs.sh
ENTRYPOINT ["/bin/bash"]
