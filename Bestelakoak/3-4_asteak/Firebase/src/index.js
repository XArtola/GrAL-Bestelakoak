import {initializeApp} from 'firebase/app';

import {getAuth, onAuthStateChanged} from 'firebase/auth';

import {collection, getDoc, getFirestore} from 'firebase/firestore';

const firebaseApp = initializeApp({

        apiKey: "AIzaSyCOw5DYNuHmh-XzTiha50r_teE1wqpNkLY",
      
        authDomain: "proba-432f6.firebaseapp.com",
      
        projectId: "proba-432f6",
      
        storageBucket: "proba-432f6.appspot.com",
      
        messagingSenderId: "10738054565",
      
        appId: "1:10738054565:web:b2f138153676713e74244c",
      
        measurementId: "G-626QDNFYCN"
      
});

const auth = getAuth(firebaseApp);
/*
const db = getFirestore(firebaseApp);
db.collection('todos').getDocs();
const todosCol = collection(db,'todos');
const snapshot = await getDocs(todosCol);
*/
onAuthStateChanged(auth, user => {

    if (user != null){
        console.log('logged in');
    }
    else
    {
        console.log('No user');
    }

});