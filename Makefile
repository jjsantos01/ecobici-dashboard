proxy:
	cd gcs-proxy && functions-framework --target proxy_get_rides --debug
server:
	python -m http.server 8000
run:
	make proxy & make server
