<div align="center">
  <img height="100x" src="https://bluefin.io/images/bluefin-logo.svg" />

  <h1 style="margin-top:20px;">SUI Events Listener</h1>

</div>

### This is the dockerization of sui for integration tests

### How to build the image
- run `docker build --tag sui .`

### How to run the container
- run `docker container run -p 9000:9000 -p 5003:5003 -p 8084:8084/udp -p 9184:9184 -dit sui`