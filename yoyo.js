import requests from "../ServerCommunication/request.js"

const regex = /{{([\s\S]*?)}}/g;
const reg = /{{([\s\S]*?)}}/g;

class yoyo 
  {
    constructor()
      {
        this.dom = {};
        this.currentPage = {};
        this.pageData = {};
        this.state = {};
        this.bindings = {};
        this.yoyoRoot = document.getElementById("yoyoContent");
      }

    start (pages, state, currentPageIndex = 0)
      {
      console.log("Starting Yoyo");

      for(let i = 0; i < state.length; i++)
        {
        this.UpdateState(state[i].key, state[i].value);
        }

      for(let i = 0; i < pages.length; i++)
        {
        const template = document.createElement('template');
        template.innerHTML = pages[i].data;
 
        this.pageData[pages[i].path] = 
          { 
          pageName : pages[i].path, 
          raw : pages[i].data, 
          virtualDom : this.BuildVirtualDom(document.createRange().createContextualFragment(pages[i].data))
          };

          if(i == currentPageIndex)
            {
            this.LoadPageIntoDOM(pages[i].path);
            }
        }
      }
    
    BuildVirtualDom(node)
      {
      let virtualNode = 
        {
        type: node.nodeType === 3 ? "TEXT" : node.tagName,
        children : [],
        targetNode : node
        }

      if(node.nodeType === 3)
        {
        if(node.nodeValue.includes("{{") && node.nodeValue.includes("}}"))
          {
          let parsingDetails = this.ParseTextBindingJavascript(node.nodeValue, virtualNode);
          virtualNode.binding = 
            {
            binding : this.CreateBinding(parsingDetails.code),
            bindingKeys : parsingDetails.bindings
            }
          }
        virtualNode.displayText = node.nodeValue;
        virtualNode.text = node.nodeValue;
        }
      else if(node.getAttribute)
        {
        virtualNode.bindings = [];

        let yoyoBinding = node.getAttribute("yo-yoBind");
        if(yoyoBinding)
          {
          node.removeAttribute("yo-yoBind");
          
          let parsingDetails = this.ParseBindingJavascript(yoyoBinding);
          virtualNode.binding = 
              {
              binding : this.CreateBinding(parsingDetails.code),
              bindingKeys : parsingDetails.bindings
              };
          }
        }

      node.childNodes.forEach(child => 
        {
        if(child.nodeValue != '\n')
          {
          virtualNode.children.push(this.BuildVirtualDom(child));
          }
        });

      return(virtualNode);
      }

    ParseTextBindingJavascript(input, virtualNode)
      {
      input = input.trim();
      let regexDetails = [...input.matchAll(reg)];
      virtualNode.bindings = [];

      let finalCodeString = input;

      let parsedData = this.ParseBindingJavascript(finalCodeString);

      finalCodeString = parsedData.code;

      let codeStart = input.indexOf("{{");
      let codeEnd = input.lastIndexOf("}}");
     
      if(codeEnd == input.length-2)
        {
        finalCodeString = input.slice(0, codeEnd) + ")";
        }
      else
        {
        finalCodeString += "\""
        }


      if(codeStart == 0)
        {
        finalCodeString = finalCodeString.replace("{{", "String(");
        }
      else
        {
        finalCodeString = "\"" + finalCodeString;
        }

      finalCodeString = finalCodeString.replaceAll("{{", "\" + String(");
      finalCodeString = finalCodeString.replaceAll("}}{{", ") + String(");
      finalCodeString = finalCodeString.replaceAll("}} {{", ") + \" \" + String(");
      finalCodeString = finalCodeString.replaceAll("}}", ") + \"");

      return { code : this.ParseBindingJavascript(finalCodeString).code, bindings : parsedData.bindings }
      }

    ParseBindingJavascript(javaScript)
      {
      let finalCode = javaScript;
      let bindings = [];
      for(let key in this.state) 
        {
        if(finalCode.includes(key))
          {
          let replaceText = "this.state." + key + ".value";
          finalCode = finalCode.replaceAll(key,replaceText);
          bindings.push(key);
          }
        }
      return { code : finalCode, bindings : bindings };
      }

    CreateBinding(value)
      {
      value = value.replaceAll("{{", "");
      value = value.replaceAll("}}", "");

      if(!value.includes("return"))
        {
        value = "return " + value;
        }

      return new Function(value).bind(this);
      }

    
    LoadPageIntoDOM(path)
      {
      for(let key in this.state)
        {
        this.bindings[key] = [];
        }

      let pageToLoad = this.pageData[path];
      let yoyoFragment = this.LoadElementIntoDOM(pageToLoad.virtualDom.children[0]);

      this.yoyoRoot.replaceChildren(yoyoFragment);
      }

    LoadElementIntoDOM(element)
      {
      let newNode = element.targetNode.cloneNode();
      if(element.binding)
        {
        let newBinding =
          {
          element : newNode,
          vElement : element,
          bindingFunction : element.binding.binding
          }

          this.ApplyBindings(newBinding);
          for(let x = 0; x < element.binding.bindingKeys.length; x++)
            {
            this.bindings[element.binding.bindingKeys[x]].push(newBinding);
            }
        }
      
      if(element.children.length != 0)
        {
        for(let i = 0; i < element.children.length; i++)
          {
          let child = this.LoadElementIntoDOM(element.children[i]);
          newNode.appendChild(child);
          }
        }

      return(newNode);
      }

    ApplyBindings(binding)
      {
      let bindingResult = binding.bindingFunction();
      if(binding.vElement.type == "TEXT")
        {
        binding.element.nodeValue = bindingResult;
        }
      else
        {
        binding.element.innerHTML = bindingResult;
        }
      }

    ReadTextElementBindings(element, node)
      {
      let replacedText = element.text;
      for(let i = 0; i < element.bindings.length; i ++)
        {
        replacedText = this.UpdateText(replacedText, element.bindings[i].replaceText, element.bindings[i].binding());
        
        if(!this.bindings[element.bindings[i].boundValue])
          {
          this.bindings[element.bindings[i].boundValue] = []
          }
        }
      return(replacedText);
      }

    UpdateText(originalText, replaceText, value)
      {
      let index = 0;
      do 
        {
        originalText = originalText.replace(replaceText, value);
        } 
      while((index = originalText.indexOf(replaceText, index + 1)) > -1);

      return(originalText);
      }

    UpdateState(targetState, newValue)
      {
      if(!this.state[targetState])
        {
        this.state[targetState] = 
            {
            value : newValue,
            }
        }
      else if(this.state[targetState].value != newValue)
        {
        this.state[targetState].value = newValue;
        this.UpdateBindings(targetState);
        }
      }

    GetStateValue(stateName)
      {
      let returnValue = this.state[stateName] ? this.state[stateName].value : null
      returnValue = Array.isArray(returnValue) ? [...returnValue] : returnValue;
      return returnValue;
      }

    UpdateBindings(stateValue) 
      {
      if(this.bindings[stateValue])
        {
        for(let i = 0; i < this.bindings[stateValue].length; i++)
          {
          this.ApplyBindings(this.bindings[stateValue][i])
          }
        }
      }
  };


export default yoyo
