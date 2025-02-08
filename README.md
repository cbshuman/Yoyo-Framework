Another javascript framework to join the sea of javascript frameworks.

You might be asking, why should I use Yoyo. If you're doing a large project with lots of requirements, I'd actually recommend you steer clear and use a more feature rich framework that's been battle tested.

If you just want to add some reactivity and a little routing to a page without having to deal with loads of dependancies, npm, yarn or any of the rest of the very messy Javascript dev ecosystem, then this might be the right choice for you.

Also if you want to learn about how those larger frameworks work under the hood (at least in principle), this isn't a bad place to start in my opinion. This is far easier to read and debug than a larger framework, and has quite a few of the features (routing, reactivity, etc.) that the larger ones have.

You'll have to do quite a bit more work to get this running than you might be used to. This is meant to be very lightweight, which is part of the reason that the only dependancy is a single js file. The goal here is to try and return to simplicity.

Here's an example of how to get started with yoyo: (you can by and large ignore the imports, they're other custom libraries I'm writing. I might include them in this repo as they do provide some nice utility)
```
import yoyo from "./js/YoyoFramework/yoyo.js";
import requests from "./js/ServerCommunication/request.js";
import websocket from "./js/ServerCommunication/websockets.js";
import webSocketReader from "./js/WebSocketHandle/webSocketReader.js";

let yoyoApp = new yoyo();
let socketReader = new webSocketReader(yoyoApp);
socketReader.yoyo = yoyoApp;

let defaultState = 
  [
    { key: 'clientUid', value: null },
    { key: 'serverName', value: "Christian Minecraft Server"},
    { key: 'playerNumber', value: 0 },
    { key: 'game1', value: "Billy's Game"},
    { key: 'chatMessages', value: [] }
  ]

requests.serverAddress = "/"

requests.ServerGET("YoyoPages/home.html", (request) => 
  {
  let pages = [{ path: "YoyoPages/home.html", data: request}];

  console.log(pages);
  yoyoApp.start(pages,defaultState);
  
  websocket.OpenWebSocket((response) => socketReader.HandleWebSocketResponse(response));
  });
```

Here's an example of a yoyo page:
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
