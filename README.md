<img src="https://raw.githubusercontent.com/IanSSenne/mcbuild/master/assets/BannerNB.png" alt="MCB Banner"/>

# mc-build

mc-build is a cli tool that helps with the creation of data packs through compiling a custom format to functions. the cli by default ships with just the mc language although you can add more languages by putting them in the `lang` folder in your project root.


## cli
|command | result|
|--------|-------|
|`mcb` | will build the project in the active directory|
|`mcb -config [js,json]` | generate a config file based on the default configs of all loaded languages. |

## installation

### yarn
```bash
$ yarn global add mc-build
```

### npm
```bash
$ npm i -g mc-build
```

## mc language format

### examples

#### functions
```
function example_function{
    say hello, this is a function
}
```
#### clocks
```
clock 20t{
  say i will be called every second
}
```

#### compile time if
```
function ex{
  !IF(this.dev){
    say this will only be emitted if the dev value is truthy in the config.
  }
}
```

#### shorthand compile time if
```
function ex{
  !dev{
    say this will only be emitted if the dev value is truthy in the config
  }
}
```

#### compile time loop
```
function ex{
  LOOP(5,i){
    say <%this.i%>
  }
}
```

#### run time if/else/elseif
```
function ex{
  if(score some value matches 0){
    say 0
  }else if(score come value matches 1){
    say 1
  }else{
    say not 0 or 1
  }
}
```

#### execute block
```
function ex{
  execute as @a at @s run{
    say hi
    tp @s ~ ~1 ~
  }
}
```

#### inline block & $block
assumes example:random sets `rand value` to a number between 0 and 100
```
function ex{
  inline{
    say hi
    execute if score rand value matches 10.. run function $block
  }
}
```

#### compile time inline code blocks
inline js code blocks are run at compile time and the result is embedded wherever it is.
```
function ex{
  say <%Math.random()%>
}
```

#### run time wait
`wait(condition,poll rate)` will evaluate the condition every `poll_rate` and if it evaluates to true it will run the following block and stop polling.
```
function ex{
  wait(if score deaths value matches 10..,1s){
    say you have died 10 times.
  }
}
```


#### namespaces

```
namespace test{
  function hello{
    say hi
  }
}
```
is equivelent to
```
function test/hello{
  say hi
}```