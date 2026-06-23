import { useState } from 'react'
import supabase from '../lib/supabase'
import img1 from '../assets/img1.svg'
import img2 from '../assets/img2.svg'
import img3 from '../assets/img3.svg'
import img4 from '../assets/img4.svg'

function LoginForm({ isLogin, onAuthSuccess, onToggleView }){
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [confirm, setConfirm] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    async function handleSubmit(e){
        e.preventDefault()
        setErrorMessage('')

        if (!email || !password){
            setErrorMessage('Please fill in both your email and password!')
            return
        }

        let data, error

        try{
            setLoading(true)
            if (isLogin){
                ({ data, error } = await supabase.auth.signInWithPassword({email, password}))
            }
            else{
                ({ data, error } = await supabase.auth.signUp({email, password}))
            }

            if (error){
                setErrorMessage(error.message)
                return
            }

            if (data.session){
                onAuthSuccess(data.user)
            }
            else{
                setConfirm(true)
            }
        }
        catch(err){
            setErrorMessage("Something went wrong. Please try again.")
        }
        finally{    
            setLoading(false)
        }
    }

    return(
        <div className="relative w-full">
            <div className="absolute -top-[clamp(4rem,6vw,6.5rem)] left-1/2 -translate-x-1/2 w-[clamp(9rem,12vw,14rem)] flex items-center justify-center z-0">
                <img src={img3} alt="" className="w-full" />
            </div>

            <div className="relative z-10 bg-slate-800/70 border border-slate-600/40 rounded-2xl pt-16 pb-12 px-10 shadow-xl backdrop-blur-sm">
                {confirm && (
                    <div className="mb-4 text-center">
                        <h3 className="text-slate-200 text-[clamp(0.85rem,1vw,1rem)] font-medium">Please confirm your email!</h3>
                    </div>
                )}

                {errorMessage && (
                    <div className="mb-4 text-center">
                        <p className="text-red-400 text-[clamp(0.8rem,0.9vw,0.95rem)]">{errorMessage}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-[clamp(0.75rem,1.4vw,1.25rem)]">
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full bg-slate-900/60 border border-slate-600/50 rounded-full px-[clamp(1rem,1.8vw,1.5rem)] py-[clamp(0.6rem,1.2vw,1rem)] text-[clamp(0.9rem,1vw,1.05rem)] text-slate-200 placeholder-slate-400 outline-none focus:border-slate-400/60 transition-colors"
                    />

                    <div className="password-container relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Password"
                            className="w-full bg-slate-900/60 border border-slate-600/50 rounded-full px-[clamp(1rem,1.8vw,1.5rem)] py-[clamp(0.6rem,1.2vw,1rem)] text-[clamp(0.9rem,1vw,1.05rem)] text-slate-200 placeholder-slate-400 outline-none focus:border-slate-400/60 transition-colors pr-[clamp(3rem,4vw,4.5rem)]"
                        />

                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-[clamp(1rem,1.8vw,1.5rem)] top-1/2 -translate-y-1/2 text-[clamp(0.8rem,0.9vw,0.95rem)] text-slate-400 hover:text-slate-200 transition-colors"
                        >
                            {showPassword ? "Hide" : "Show"}
                        </button>
                    </div>

                    <p className="text-[clamp(0.8rem,0.9vw,0.95rem)] text-slate-400 hover:text-slate-300 cursor-pointer -mt-1">
                        Forgot Password?
                    </p>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-100 text-[clamp(0.9rem,1vw,1.05rem)] font-medium rounded-full py-[clamp(0.65rem,1.2vw,1rem)] mt-1 transition-colors"
                    >
                        {isLogin ? "Login" : "Sign Up"}
                    </button>

                    <div className="flex items-center gap-3 my-1">
                        <span className="flex-1 h-px bg-slate-600/50" />
                        <span className="text-[clamp(0.65rem,0.7vw,0.75rem)] tracking-wide text-slate-400 whitespace-nowrap">OR CONTINUE WITH</span>
                        <span className="flex-1 h-px bg-slate-600/50" />
                    </div>

                    <p
                        onClick={onToggleView}
                        className="text-[clamp(0.8rem,0.9vw,0.95rem)] text-slate-400 hover:text-slate-300 text-center cursor-pointer"
                    >
                        {isLogin ? "Don't have an Account? Sign up" : "Returning user? Log In!"}
                    </p>
                </form>
            </div>
        </div>
    )
}

export default function Auth({ onAuthSuccess }){
    const [isLogin, setIsLogin] = useState(true)

    function toggleView(){
        setIsLogin(!isLogin)
    }

    return(
        <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-3">
            <div className="relative w-full h-[calc(100vh-1.5rem)] bg-linear-to-br from-slate-800 to-slate-950 rounded-2xl overflow-hidden">

                <img
                    src={img4}
                    alt="StreamBuddy"
                    className="absolute top-[clamp(1.5rem,3vw,2.5rem)] left-[clamp(1.5rem,3vw,2.5rem)] w-[clamp(160px,18vw,320px)] object-contain z-20"
                />

                <div className="h-full w-full flex items-center justify-center gap-[clamp(1rem,4vw,4rem)] px-[clamp(1rem,5vw,6rem)]">

                    <img
                        src={img2}
                        alt="StreamBuddy illustration"
                        className="hidden sm:block w-[clamp(160px,22vw,420px)] shrink object-contain mr-auto"
                    />

                    <img
                        src={img1}
                        alt=""
                        className="hidden lg:block w-[clamp(140px,16vw,320px)] shrink object-contain -translate-y-[clamp(0.5rem,1.8vw,1.5rem)]"
                    />

                    <div className="shrink-0 w-[clamp(280px,32vw,560px)] ml-auto">
                        <LoginForm isLogin={isLogin} onToggleView={toggleView} onAuthSuccess={onAuthSuccess} />
                    </div>
                </div>

            </div>
        </div>
    )
}