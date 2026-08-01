export function validarCPF(valorBruto: string): boolean {
  const cpf = valorBruto.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const digitos = cpf.split("").map(Number);

  const calcularDigito = (tamanho: number) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) {
      soma += digitos[i] * (tamanho + 1 - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const primeiroDigito = calcularDigito(9);
  const segundoDigito = calcularDigito(10);

  return primeiroDigito === digitos[9] && segundoDigito === digitos[10];
}

export function calcularIdade(dataNascimento: string | Date): number {
  const nascimento = new Date(dataNascimento);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const aindaNaoFezAniversario =
    hoje.getMonth() < nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate());
  if (aindaNaoFezAniversario) idade -= 1;
  return idade;
}

export function isMaiorDeIdade(dataNascimento: string | Date): boolean {
  if (!dataNascimento) return false;
  return calcularIdade(dataNascimento) >= 18;
}

export function isCnhValida(validade: string | Date): boolean {
  if (!validade) return false;
  const dataValidade = new Date(validade);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return dataValidade.getTime() >= hoje.getTime();
}
