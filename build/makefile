VPATH = ../src
CFLAGS = -std=c++11
INC = -I/usr/include/jsoncpp -I/usr/local/opt/openssl/include/

OBJ = main.o webserver.o iqdata.o spectrum.o utility.o jconfig.o rspduo.o

rspduo: $(OBJ)
	c++ -o rspduo $(OBJ) -lpthread -lwebsockets -ljsoncpp -lfftw3 -lmirsdrapi-rsp

clean:
	@rm -f *.o *.d

%.o:%.cpp
	c++ -c $(CFLAGS) $(INC) $^
