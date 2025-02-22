Another javascript framework to join the sea of javascript frameworks.

You might be asking, why should I use Yoyo. If you're doing a large project with lots of requirements, I'd actually recommend you steer clear and use a more feature rich framework that's been battle tested.

If you just want to add some reactivity and a little routing to a page without having to deal with loads of dependancies, npm, yarn or any of the rest of the very messy Javascript dev ecosystem, or you just want to learn about how a lot of these frameworks work under the hood, then this might be the right choice for you.

If you want to learn about how those larger frameworks work under the hood (at least in principle), this isn't a bad place to start in my opinion. This is far easier to read and debug than a larger framework, and has quite a few of the features (routing, reactivity, etc.) that the larger ones have. 

You'll have to do quite a bit more work to get this running than you might be used to. This is meant to be very lightweight, which is part of the reason that the only dependancy is a single js file. The goal here is to try and return to simplicity.

Here's an example of how to get started with yoyo: (you can by and large ignore the imports, they're other custom libraries I'm writing. I might include them in this repo as they do provide some nice utility)

(Also the full context of this is here - https://github.com/cbshuman/ExpansiaPages ; It is more up to date and has better examples of how the framework is actually supposed to work)

```
//mainScript.js

import yoyo from "./js/YoyoFramework/yoyo.js";
import requests from "./js/ServerCommunication/request.js";
import websocket from "./js/ServerCommunication/websockets.js";
import webSocketReader from "./js/WebSocketHandle/WebSocketReader.js";
import webSocketWriter from "./js/WebSocketHandle/WebSocketWriter.js";

let yoyoApp = new yoyo();
let yoyoPages = 
  [
    { path: "YoyoData/YoyoPages/home.html", yoyoPath : "home" },
    { path: "YoyoData/YoyoPages/dataEditor.html", yoyoPath : "dataEditor" }
  ];

let yoyoComponents = 
  [
    { path: "YoyoData/YoyoComponents/header.html", name : "header" },
    { path: "YoyoData/YoyoComponents/chat.html", name : "serverchat" },
  ];


let socketWriter;
let socketReader = new webSocketReader(yoyoApp, () => 
  {
  socketWriter.SetClientUid(yoyoApp.GetStateValue("clientUid"));
  socketWriter.RequestCurrentGameList();
  socketWriter.RequestCurrentPlayerList();
  });

console.log(yoyoApp);

let defaultState = 
  [
    { key: 'clientUid', value: null },
    { key: 'serverName', value: "Christian Minecraft Server"},
    { key: 'playerList', value: [] },
    { key: 'gameList', value: [] },
    { key: 'chatMessages', value: new Array( 10 ) }
  ]

socketReader.yoyo = yoyoApp;

requests.serverAddress = "/"

let pages = [];
let components = [];

for(let i = 0; i < yoyoComponents.length; i++)
  {
  requests.ServerGET(yoyoComponents[i].path, (request) => 
    {
    components.push({ name: yoyoComponents[i].name, data: request});

    if(i == yoyoComponents.length -1)
      {
      GetYoyoPages();
      }
    });
  }

let GetYoyoPages = () => 
  {
  for (let i = 0; i < yoyoPages.length; i++)
   {
   requests.ServerGET(yoyoPages[i].path, (request) => 
      {
      pages.push({ path: yoyoPages[i].yoyoPath, data: request});

      if(i == yoyoPages.length -1)
        {
        yoyoApp.start(pages,components, defaultState);
        websocket.OpenWebSocket( (response, writer) => 
          {
          socketReader.HandleWebSocketResponse(response);
          socketWriter = new webSocketWriter(writer);
          yoyoApp.UpdateState("socketWriter", socketWriter);
          });
        }
     });
    }
  }

```
Your index.html or home.html, or whatever page you are using to serve the web page should more or less look like this:
```
<html>
  <head>
    <title> Expansia Server v0.0.1</title>
    <script type = "module" text ="type/javascript" src="/mainScript.js"></script>
    <link rel="stylesheet" type="text/css" href="/main.css" >
  </head>
  <body>
    <div id = "yoyoContent"> 
      <Header></Header> 
      <yoyo></yoyo>
      <ServerChat><Serverchat/>
    </div>
  </body>
</html>
```

Here's an example of a yoyo page or component (both essentially are the same):
```
<div> Server Name : {{serverName}} {{serverName}}
  <p> Current ClientId : {{clientUid}} </p>
  <p> Players online : {{playerNumber}} {{clientUid}} </p> 
  <p> Current Games: 
    <ol>
      <li> {{game1}} </li>
    </ol>
  </p>
  <p> Chat Feed : </p>
  <div>
    <ol yo-yoBind = "let messages = [];
        for(let i = 0; i < chatMessages.length; i++)
          {
          let message = chatMessages[i];
          messages.push('<li>['+ message.Sender + ']: ' + message.Text  +'</li>');
          }
        return(messages.join(''));">
      </ol>
      <button> Send Chat </button>
      <input />
    </div>
    <p> {{(5 + 5)}} {{6}} {{game1 + String(8)}} </p>
</div>
```
If I get some time, I might add some more documentation on how this all should be set up. Right now I'm thinking about working on embeded components.

Also creating a framework is probably easier than you think it is. I made this in about a week in the evening after I got off work, and I wasn't even that commited, this was part of a larger project. Give it a try if even just so you can learn how things work under the hood. 
Feel free to use this as base, it's been put together purely for educational purposes as far as I'm concerned.
