const client=require('./elasticsearch')

function create(){
    client.create({
        index:"users",
        document:body,
        id:body.id
    })
}


module.exports={create}