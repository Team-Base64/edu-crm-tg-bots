printf "Copy scripts:\n"
sudo docker cp . db:/
printf "DROP TABLE:\n"
sudo docker exec -it db psql -U spuser -d tgBotsDb -a -f ./drop.sql -S | grep -E "(NOTICE|ERROR)" && printf "\n"
printf "CREATE TABLE:\n"
sudo docker exec -it db psql -U spuser -d tgBotsDb -a -f ./init.sql | grep -E "(NOTICE|ERROR)" && printf "\n"
printf "POPULTE TABLE:\n"
sudo docker exec -it db psql -U spuser -d tgBotsDb -a -f ./populate.sql  | grep -E "(NOTICE|ERROR)" && printf "\n"