export interface JWTClaims {

    iss: string; //server identity jisne issue kiya 
    sub: string; //subject means userID
    email: string; 
    email_verified: boolean;
    exp: number; 
    iat: number; //issued at time in Unix secound
    given_name: string; 
    family_name?: string | undefined;
    name: string;
    aud: string; //audiance , also known as client app 


}
