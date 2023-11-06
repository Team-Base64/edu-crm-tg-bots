build:
	sudo docker compose up -d --build

build-int:
	sudo docker compose up --build

stop:
	sudo docker compose down

container-prune:
	sudo docker container prune -f

image-prune:
	sudo docker image prune -f

inspect-postgres:
	docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' postgres

postgres-bash:
	sudo docker exec -it postgres bash

docker-prune-all:
	sudo docker system prune -a

docker-fix:
	- sudo killall containerd-shim

connect-psql:
	sudo docker exec -it postgres psql -U spuser -d tgBotsDb

populate-db: 
	bash ./db/recreateDb.sh
