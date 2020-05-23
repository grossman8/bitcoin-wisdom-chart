# Wisdom Chart

Open source rebuild of BitcoinWisdom.com charts.  

Why? You might be asking... because they're the simpliest and best crypto charts.



## Getting started

```

// Create a new ./lib/config.js file which points to your data server

export const getConfig = () => {
  return {
    webservice_host: 'some site that returns timeseries data',
    websocket_host: 'websocket that streams trades',
    jwt: 'auth token, if implemented'
  }
}

```


Start dev server
```
$ npm run dev

```



MIT License, have fun!
