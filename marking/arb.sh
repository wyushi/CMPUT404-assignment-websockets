cd /home/me
/usr/bin/wget http://172.28.92.131:8118/runtest.sh
/bin/bash runtest.sh $1
if [ "$2" == 1 ];
then
	/bin/bash
fi
