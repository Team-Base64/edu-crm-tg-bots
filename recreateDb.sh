make set-env && cd tg-bots-sql
printf "Copy scripts:\n"
sudo docker cp . db:/
printf "DROP TABLE:\n"
echo ${POSTGRES_USER}
echo ${POSTGRES_DB}
sudo docker exec -it db psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -a -f ./1.drop.sql -S | grep -E "(NOTICE|ERROR)" && printf "\n"
printf "CREATE TABLE:\n"
sudo docker exec -it db psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -a -f ./2.init.sql | grep -E "(NOTICE|ERROR)" && printf "\n"
printf "POPULTE TABLE:\n"
sudo docker exec -it db psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -a -f ./3.populate.sql  | grep -E "(NOTICE|ERROR)" && printf "\n"
