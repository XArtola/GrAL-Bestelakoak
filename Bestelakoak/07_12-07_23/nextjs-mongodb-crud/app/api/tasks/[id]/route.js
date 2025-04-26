import { NextResponse } from "next/server";
import {connectDB} from "@/utils/mongoose";
import Task from "@/models/Task";

export async function GET(request, { params }) {

   try{
    connectDB();
    const taskFound = await Task.findById(params.id);

    if (!taskFound) {
        return NextResponse.json({
            message: `Tarea no encontrada...${params.id}`,
        }, { status: 404 });
    }

    return NextResponse.json(taskFound);
   }
   catch(error){
       return NextResponse.json({
           message: error.message
       },{status: 400});
   }
}


export async function PUT(request, { params }) {

    try{
        const data = await request.json();
        connectDB();
        const taskUpdated = await Task.findByIdAndUpdate(params.id, data, {
            new: true
        });
        console.log(taskUpdated);
        return NextResponse.json(taskUpdated);
    
    }
    catch(error){
        console.log(error);
        return NextResponse.json({message: error.message},{
            status: 400});
    }
}

export async function DELETE(request, { params }) {
    try{
    const deletedTask = await Task.findByIdAndDelete(params.id);

    if (!deletedTask) {
        return NextResponse.json({
            message: `Tarea no encontrada...${params.id}`,
        }, { status: 404 });
    }

    //console.log(params);
    return NextResponse.json(deletedTask);
    }
    catch(error){
        return NextResponse.json({
            message: error.message
        },{status: 400});
    }
}
