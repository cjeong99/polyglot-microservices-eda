FROM kong:3

USER root

# Copy declarative config into the image
COPY kong.yml /etc/kong/kong.yml

USER kong
