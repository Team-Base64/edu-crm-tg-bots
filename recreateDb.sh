cd .. && make set-env && cd db
printf "Copy scripts:\n"
sudo docker cp . db:/
printf "DROP TABLE:\n"
sudo docker exec -it db psql -U ${SQL_TG_USER} -d ${SQL_TG_DB_NAME} -a -f ./drop.sql -S | grep -E "(NOTICE|ERROR)" && printf "\n"
printf "CREATE TABLE:\n"
sudo docker exec -it db psql -U ${SQL_TG_USER} -d ${SQL_TG_DB_NAME} -a -f ./init.sql | grep -E "(NOTICE|ERROR)" && printf "\n"
printf "POPULTE TABLE:\n"
sudo docker exec -it db psql -U ${SQL_TG_USER} -d ${SQL_TG_DB_NAME} -a -f ./populate.sql  | grep -E "(NOTICE|ERROR)" && printf "\n"
