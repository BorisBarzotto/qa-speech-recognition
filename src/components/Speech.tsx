"use client"
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import axios from 'axios';

// Function to convert audio blob to base64 encoded string
const audioBlobToBase64 = (blob: Blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const arrayBuffer = reader.result;
            const base64Audio = btoa(
                new Uint8Array(arrayBuffer as ArrayBuffer).reduce(
                    (data, byte) => data + String.fromCharCode(byte),
                    ''
                )
            );
            resolve(base64Audio);
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
    });
};

const Speech = () => {
    const [recording, setRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [transcription, setTranscription] = useState('');

    // Cleanup function to stop recording and release media resources
    useEffect(() => {
        return () => {
            if (mediaRecorder) {
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [mediaRecorder]);

    const apiKey = process.env.NEXT_PUBLIC_REACT_APP_GOOGLE_API_KEY;
    if (!process.env.NEXT_PUBLIC_REACT_APP_GOOGLE_API_KEY) {
        throw new Error("REACT_APP_GOOGLE_API_KEY not found in the environment");
    }

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            recorder.start();
            console.log('Recording started');

            // Event listener to handle data availability
            recorder.addEventListener('dataavailable', async (event) => {
                console.log('Data available event triggered');
                const audioBlob = event.data;

                const base64Audio = await audioBlobToBase64(audioBlob);
                //console.log('Base64 audio:', base64Audio);

                try {
                    const startTime = performance.now();

                    const response = await axios.post(
                        `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
                        {
                            config: {
                                encoding: 'WEBM_OPUS',
                                sampleRateHertz: 48000,
                                languageCode: 'es-ES',
                            },
                            audio: {
                                content: base64Audio,
                            },
                        }
                    );

                    const endTime = performance.now();
                    const elapsedTime = endTime - startTime;

                    //console.log('API response:', response);
                    console.log('Time taken (ms):', elapsedTime);

                    if (response.data.results && response.data.results.length > 0) {
                        setTranscription(response.data.results[0].alternatives[0].transcript);
                    } else {
                        console.log('No transcription results in the API response:', response.data);
                        setTranscription('No transcription available');
                    }
                } catch (error) {
                    console.error('Error with Google Speech-to-Text API:', error);
                }
            });

            setRecording(true);
            setMediaRecorder(recorder);
        } catch (error) {
            console.error('Error getting user media:', error);
        }
    };

    const stopRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            console.log('Recording stopped');
            setRecording(false);
        }
    };


    return (
        <div className="container text-center max-w-lg p-8 rounded-2xl bg-zinc-100 shadow-[rgba(50,50,93,0.25)_0px_6px_12px_-2px,_rgba(0,0,0,0.3)_0px_3px_7px_-3px]">
            <div className="flex flex-col justify-center items-center gap-4">
                <Image src="/logo.svg" width={100} height={100} alt="Speech to Text" />
                <h1 className="font-bold text-zinc-700">SPEECH TO TEXT</h1>
                {!recording ? (
                    <button onClick={startRecording} className="bg-green-700 text-zinc-50 px-4 py-2">Start Recording</button>
                ) : (
                    <button onClick={stopRecording} className="bg-red-700 text-zinc-50 px-4 py-2">Stop Recording</button>
                )}
                <div className="p-3 border-2 transition-all w-full h-96 bg-zinc-50 rounded-2xl">
                    <p className="text-zinc-800 underline underline-offset-4">TRANSCRIPTION</p>
                    <p className="mt-2">{transcription}</p>
                </div>
                <button onClick={() => setTranscription('')} className="bg-gray-700 text-zinc-50 px-4 py-2 mt-2">Clear</button>
            </div>
        </div>
    );
};
export default Speech;