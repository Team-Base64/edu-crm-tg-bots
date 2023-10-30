run-redis:
	redis-server --daemonize yes

redis-ping:
	redis-cli ping
