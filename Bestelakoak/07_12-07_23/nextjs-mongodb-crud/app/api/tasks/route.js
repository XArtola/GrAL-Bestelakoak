import Task from "@/models/Task";
import { NextResponse } from "next/server";
import {connectDB} from "@/utils/mongoose";

export async function GET() {
    connectDB();
    const tasks = await Task.find();
    //console.log(params);
    return NextResponse.json(tasks);
}

export async function POST(request){

    try {
        connectDB();
        const data = await request.json();
        //console.log(data);
        const newTask = new Task(data)
        //console.log(newTask);
        const savedTask = await newTask.save();
        //console.log(savedTask);
        return NextResponse.json(savedTask);
    } catch (error) {
        return NextResponse.json({
            message: error.message
        },{status: 400});
    }
};