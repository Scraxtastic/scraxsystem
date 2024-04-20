# Scrax system (WIP)
V1.1 

The Scrax System is a server and client connection platform that allows users to connect their clients to their own server and access their functionality through a protected connection. The clients (e.g. Raspberry pis) send basic data like the temperature, ram usage, etc., which the userclients can access through the app or website.

The Scrax System is accessible through two main interfaces: the UserClient (Android app created with React
Native) and Web Browser (in progress). The UserClient allows users to establish an encrypted connection with the server and through the server to the clients.

The Scrax System also includes a modding system, which allows users to add custom modifications to their clients. These mods can add additional functionality or features that are not available in the base client.


## Current State
- [x] Base system 
- [ ] mod library is created
- [ ] userClient to mod communication
- [ ] encrypted userClient to mod communication


## Scrax system server
The server is included in this repo in the folder `src/server`.
It handles the connection from the client to the server and decrypts the content on the server to reencrypt it for the connected receiver/userclients, so that they can show the information.

It dispatches the mod messages to the destined clients, so that the clients can exchange public keys and communicate in a fully encrypted connection.
## Scrax system (base) client
The base client is included in this repo in the folder `src/client`. 
It uses a WebSocket to connect to the server and handles the second layer encryption with the server. 
It furthermore creates a WebSocketServer for making it possible for the mods to add themselves to the client.


## Scrax system userclient
[The userclient](https://github.com/Scraxtastic/scraxsystemclient) is the (Android) app, created in React-Native, so that it could be ported to IOS and Web as well. 
It's still WIP (Work in progress) and will receive a bunch of changes, because the first version was created to funciton as fast as possible, which kind of backfires right now.

## Scrax system mods (WIP)
[The scrax system mods repository](https://github.com/Scraxtastic/scraxsystemmods) is currently just a collection of several usable mods. 
I am still thinking about a proper way to organize the mods I create.

The most probable solution will be a library for modding (nodejs & python), which handles the connection between the mod and the client. So the developer can concentrate on developing the mod and can mostly ignore the networking stuff.

## Server


### Dev
Run server using `npm run dev:server`

### Prod
Run server using `npm run start:server`

## Client


### Dev
Run server using `npm run dev:sender`

### Prod
Run server using `npm run start:client`

