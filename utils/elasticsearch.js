const {Client}=require("@elastic/elasticsearch")

function connect(){
    const client = new Client({
        node:"https://localhost:9200/",
        auth:{
            username:"elastic",
            password:"1gWd4U-XNctgPwtaZpt*"
        },
        tls:{
            rejectUnauthorized:false
        }
      });


      return client;
}
module.exports=connect();