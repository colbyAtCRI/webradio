VPATH = ../src ../html
CFLAGS = -std=c++11
INC = -I/usr/include/jsoncpp -I/usr/local/opt/openssl/include/
LIBS = -lmirsdrapi-rsp -lwebsockets -ljsoncpp

OBJ = main.o webserver.o sdrplay.o control.o 

sdrplay: main.o sdrplay.o webserver.o control.o 
	c++ -o sdrplay $(CFLAGS) $(OBJ) $(LIBS) 

bundle.js: index.js
	browserify $^ -o ../html/$@

rspduo: $(OBJ)
	c++ -o rspduo $(OBJ) -lpthread -lwebsockets -ljsoncpp -lfftw3 -lmirsdrapi-rsp

clean:
	@rm -f *.o *.d *.log rspduo

%.o:%.cpp
	c++ -c $(CFLAGS) $(INC) $^
