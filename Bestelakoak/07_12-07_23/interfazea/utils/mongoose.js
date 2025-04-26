import {connect, connection} from 'mongoose';

const conn = {
    isConnected: false,
}; 

export async function connectDB() {

    if (conn.isConnected) return;
    
    const db = await connect('mongodb://localhost:27017/GrAL')
    console.log(db.connection.db.databaseName);
    conn.isConnected = db.connections[0].readyState;

}

connection.on('connected',() => {
    console.log('MongoDB connected');
})

connection.on('error', (err) => {
    console.log('MongoDB connection error: ', err);
})

